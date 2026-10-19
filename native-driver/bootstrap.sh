#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
command -v flutter >/dev/null || { echo 'Install the Flutter SDK first.'; exit 1; }
task_backup=$(mktemp -d)
cp pubspec.yaml "$task_backup/pubspec.yaml"
cp -R lib "$task_backup/lib"
flutter create --platforms=android,ios --org=com.hornandharvest --project-name horn_harvest_driver .
cp "$task_backup/pubspec.yaml" pubspec.yaml
cp -R "$task_backup/lib/." lib/
rm -rf "$task_backup"
python3 configure_platforms.py
flutter pub get
dart format lib
flutter analyze
