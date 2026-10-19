import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:geolocator/geolocator.dart';
import 'package:sqflite/sqflite.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:uuid/uuid.dart';
const origin=String.fromEnvironment('HH_API_ORIGIN');
Future<void> main()async{
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options:const FirebaseOptions(apiKey:String.fromEnvironment('HH_FIREBASE_API_KEY'),appId:String.fromEnvironment('HH_FIREBASE_APP_ID'),messagingSenderId:String.fromEnvironment('HH_FIREBASE_SENDER_ID'),projectId:String.fromEnvironment('HH_FIREBASE_PROJECT_ID')));
  runApp(MaterialApp(title:'Horn & Harvest',theme:ThemeData(colorScheme:ColorScheme.fromSeed(seedColor:const Color(0xff1c3b2f),surface:const Color(0xfff5f0e1)),scaffoldBackgroundColor:const Color(0xfff5f0e1)),home:const DriverHome()));
}
Future<dynamic> api(String path,[Map<String,dynamic>? body])async{
  final user=FirebaseAuth.instance.currentUser;
  if(user==null)throw Exception('Sign in first.');
  final base=Uri.parse(origin);
  if(base.scheme!='https')throw Exception('Configure the HTTPS API origin.');
  final uri=base.resolve('/api/operations$path'),headers={
    'Authorization':'Bearer ${await user.getIdToken()}','Content-Type':'application/json','Idempotency-Key':const Uuid().v4()
  }
  ;
  final response=await (body==null?http.get(uri,headers:headers):http.post(uri,headers:headers,body:jsonEncode(body))).timeout(const Duration(seconds:20));
  final value=jsonDecode(response.body);
  if(response.statusCode>=400)throw Exception(value['error']??'Request failed.');
  return value;
}
class TrackingQueue{
  Database? db;
  StreamSubscription<Position>? subscription;
  Timer? timer;
  bool uploading=false;
  String? orderId;
  String? uid;
  Future<Database> database()async{
    return db??=await openDatabase('${await getDatabasesPath()}/hh_driver_v1.db',version:1,onCreate:(d,v)=>d.execute('CREATE TABLE locations (eventId TEXT PRIMARY KEY, uid TEXT NOT NULL, orderId TEXT NOT NULL, payload TEXT NOT NULL)'));
  }
  Future<void> start(String id)async{
    await stop();
    uid=FirebaseAuth.instance.currentUser?.uid;
    if(uid==null)throw Exception('Sign in first.');
    final order=(await api('/orders/$id'))['order'];
    if(!['Left warehouse','Arrived'].contains(order['status']))throw Exception('Tracking starts after dispatch.');
    if(!await Geolocator.isLocationServiceEnabled())throw Exception('Enable location services.');
    var permission=await Geolocator.checkPermission();
    if(permission==LocationPermission.denied)permission=await Geolocator.requestPermission();
    if(permission!=LocationPermission.always)throw Exception('Allow background location in device settings before starting delivery tracking.');
    orderId=id;
    final startedAt=DateTime.now().toUtc();
    final LocationSettings settings=Platform.isAndroid?AndroidSettings(accuracy:LocationAccuracy.high,distanceFilter:80,intervalDuration:const Duration(seconds:20),foregroundNotificationConfig:const ForegroundNotificationConfig(notificationTitle:'Horn & Harvest delivery tracking',notificationText:'Location is shared only for the active delivery.',enableWakeLock:true)):AppleSettings(accuracy:LocationAccuracy.high,distanceFilter:80,activityType:ActivityType.automotiveNavigation,pauseLocationUpdatesAutomatically:false,showBackgroundLocationIndicator:true,allowBackgroundLocationUpdates:true);
    subscription=Geolocator.getPositionStream(locationSettings:settings).listen((p)async{
      if(p.timestamp.toUtc().isBefore(startedAt))return;
      try{
        await enqueue(p);
      }
      catch(e){
        await stop();
      }
    }
    );
    timer=Timer.periodic(const Duration(seconds:20),(_)async{
      try{
        await flush();
        final current=(await api('/orders/$id'))['order'];
        if(!['Left warehouse','Arrived'].contains(current['status']))await stop();
      }
      catch(_){
        /* Queue is retained during network loss. */
      }
    }
    );
  }
  Future<void> enqueue(Position p)async{
    if(orderId==null||uid==null)return;
    final event={
      'eventId':const Uuid().v4(),'latitude':p.latitude,'longitude':p.longitude,'capturedAt':p.timestamp.toUtc().toIso8601String(),'accuracyMetres':p.accuracy
    }
    ;
    await (await database()).insert('locations',{
      'eventId':event['eventId'],'uid':uid,'orderId':orderId,'payload':jsonEncode(event)
    }
    ,conflictAlgorithm:ConflictAlgorithm.ignore);
    try{
      await flush();
    }
    catch(_){
      /* Keep collecting GPS offline; never delete unaccepted events. */
    }
  }
  Future<void> flush()async{
    if(uploading)return;
    final current=FirebaseAuth.instance.currentUser;
    if(current==null)return;
    uploading=true;
    try{
      final d=await database(),events=await d.query('locations',where:'uid = ?',whereArgs:[current.uid],limit:100);
      final groups=<String,List<Map<String,Object?>>>{
      }
      ;
      for(final e in events){
        groups.putIfAbsent(e['orderId'] as String,()=>[]).add(e);
      }
      for(final entry in groups.entries){
        await api('/orders/${entry.key}/locations',{
          'events':entry.value.map((e)=>jsonDecode(e['payload'] as String)).toList()
        }
        );
        await d.transaction((t)async{
          for(final event in entry.value){
            await t.delete('locations',where:'eventId = ?',whereArgs:[event['eventId']]);
          }
        }
        );
      }
    }
    finally{
      uploading=false;
    }
  }
  Future<void> stop()async{
    await subscription?.cancel();
    subscription=null;
    timer?.cancel();
    timer=null;
    orderId=null;
  }
  Future<void> dispose()async{
    await stop();
    await db?.close();
  }
}
class DriverHome extends StatefulWidget{
  const DriverHome({
    super.key
  }
  );
  @override State<DriverHome>createState()=>_DriverHome();
}
class _DriverHome extends State<DriverHome>{
  final email=TextEditingController(),password=TextEditingController(),receiver=TextEditingController();
  final queue=TrackingQueue();
  List<dynamic> orders=[];
  String? selected;
  String message='';
  bool busy=false;
  StreamSubscription<User?>? authListener;
  Timer? refreshTimer;
  @override void initState(){
    super.initState();
    authListener=FirebaseAuth.instance.authStateChanges().listen((u){
      if(u==null){
        queue.stop();
        if(mounted)setState(()=>orders=[]);
      }
      else{
        refresh();
        queue.flush().catchError((_){
        }
        );
      }
    }
    );
    refreshTimer=Timer.periodic(const Duration(seconds:30),(_)=>refresh());
  }
  Future<void> run(Future<void> Function() fn)async{
    if(busy)return;
    setState(()=>busy=true);
    try{
      await fn();
      if(mounted)setState(()=>message='Saved.');
    }
    catch(e){
      if(mounted)setState(()=>message=e.toString());
    }
    finally{
      if(mounted)setState(()=>busy=false);
    }
  }
  Future<void> refresh()async{
    if(FirebaseAuth.instance.currentUser==null)return;
    try{
      final d=await api('/workspace');
      if(d['role']!='driver')throw Exception('Authorised driver account required.');
      if(mounted)setState(()=>orders=d['orders']);
    }
    catch(e){
      if(mounted)setState(()=>message=e.toString());
    }
  }
  Future<void> advance(Map<String,dynamic> order,String status)async{
    final body=<String,dynamic>{
      'status':status
    }
    ;
    if(status=='Delivered'){
      if(receiver.text.trim().isEmpty)throw Exception('Receiver full name required.');
      final image=await ImagePicker().pickImage(source:ImageSource.camera,maxWidth:1600,imageQuality:75);
      if(image==null)throw Exception('Delivery photo required.');
      final bytes=await image.readAsBytes();
      if(bytes.length>5*1024*1024)throw Exception('Photo exceeds 5 MB.');
      body['photo']='data:image/jpeg;base64,${base64Encode(bytes)}';
      body['recipient']=receiver.text.trim();
      await queue.flush();
    }
    await api('/orders/${order['id']}/status',body);
    if(status=='Delivered')await queue.stop();
    await refresh();
  }
  @override Widget build(BuildContext context){
    final user=FirebaseAuth.instance.currentUser;
    final current=orders.where((o)=>o['id']==selected).firstOrNull;
    const stages={
      'Ready for collection':'Left warehouse','Left warehouse':'Arrived','Arrived':'Delivered'
    }
    ;
    return Scaffold(appBar:AppBar(title:Image.asset('assets/logo.png',height:45),actions:[if(user!=null)IconButton(tooltip:'Sign out',onPressed:()=>run(()async{
      await queue.stop();
      await FirebaseAuth.instance.signOut();
    }
    ),icon:const Icon(Icons.logout))]),body:SafeArea(child:ListView(padding:const EdgeInsets.all(20),children:[if(message.isNotEmpty)Text(message),if(user==null)...[TextField(controller:email,decoration:const InputDecoration(labelText:'Email')),TextField(controller:password,obscureText:true,decoration:const InputDecoration(labelText:'Password')),FilledButton(onPressed:busy?null:()=>run(()async{
      await FirebaseAuth.instance.signInWithEmailAndPassword(email:email.text.trim(),password:password.text);
      await refresh();
    }
    ),child:const Text('Sign in'))]else ...[const Text('Assigned deliveries',style:TextStyle(fontSize:26)),...orders.map((o)=>Card(child:ListTile(title:Text('${o['company']} • ${o['status']}'),subtitle:Text(o['address']),onTap:()=>setState(()=>selected=o['id'])))),if(current!=null)...[Text('Order ${current['id']}'),Text(current['address']),Text('Delivery window: ${current['windowStart']??'Not assigned'} – ${current['windowEnd']??''}'),...((current['lines'] as List).map((l)=>Text('${l['productName']}: ${l['boxes']} boxes'))),if(stages.containsKey(current['status']))FilledButton(onPressed:busy?null:()=>run(()=>advance(Map<String,dynamic>.from(current),stages[current['status']]!)),child:Text(stages[current['status']]!)),if(current['status']=='Arrived')TextField(controller:receiver,decoration:const InputDecoration(labelText:'Receiver full name')),if(['Left warehouse','Arrived'].contains(current['status']))FilledButton(onPressed:busy?null:()=>run(()async{
      if(queue.orderId==selected){
        await queue.stop();
      }
      else{
        await queue.start(selected!);
      }
    }
    ),child:Text(queue.orderId==selected?'STOP TRACKING':'START DELIVERY TRACKING'))],TextButton(onPressed:busy?null:()=>run(refresh),child:const Text('Refresh records'))]])));
  }
  @override void dispose(){
    authListener?.cancel();
    refreshTimer?.cancel();
    queue.dispose();
    email.dispose();
    password.dispose();
    receiver.dispose();
    super.dispose();
  }
}
