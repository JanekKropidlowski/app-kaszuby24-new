// Entry point apki. Rejestruje handlery widgetu Android (poza komponentami React,
// muszą być na starcie). iOS ma osobny natywny target (targets/widget), nie tu.
import 'expo-router/entry';
import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { registerWidgetTaskHandler, registerWidgetConfigurationScreen } = require('react-native-android-widget');
  const { widgetTaskHandler } = require('./widgets/android');
  const { WidgetConfigScreen } = require('./widgets/WidgetConfigScreen');
  registerWidgetTaskHandler(widgetTaskHandler);
  registerWidgetConfigurationScreen(WidgetConfigScreen);
}
