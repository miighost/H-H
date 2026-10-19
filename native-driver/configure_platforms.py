from pathlib import Path
import plistlib
import xml.etree.ElementTree as ET
android='http://schemas.android.com/apk/res/android'
ET.register_namespace('android',android)
p=Path('android/app/src/main/AndroidManifest.xml')
tree=ET.parse(p);root=tree.getroot()
perms=['INTERNET','ACCESS_COARSE_LOCATION','ACCESS_FINE_LOCATION','ACCESS_BACKGROUND_LOCATION','FOREGROUND_SERVICE','FOREGROUND_SERVICE_LOCATION','CAMERA']
existing={e.get('{'+android+'}name') for e in root.findall('uses-permission')}
for name in perms:
 full='android.permission.'+name
 if full not in existing:root.insert(0,ET.Element('uses-permission',{'{'+android+'}name':full}))
ET.indent(tree);tree.write(p,encoding='unicode',xml_declaration=True)
p=Path('ios/Runner/Info.plist')
with p.open('rb') as f:d=plistlib.load(f)
d.update(NSLocationWhenInUseUsageDescription='Share your position during an assigned delivery.',NSLocationAlwaysAndWhenInUseUsageDescription='Continue delivery tracking while the phone is locked; stops at delivery completion.',NSCameraUsageDescription='Capture required proof of delivery.',NSPhotoLibraryUsageDescription='Attach delivery proof.',UIBackgroundModes=['location'])
with p.open('wb') as f:plistlib.dump(d,f)
