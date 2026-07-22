/** @type {import('@bacons/apple-targets').Config} */
// Target widgetu iOS (WidgetKit). App Group musi się zgadzać z app.json (ios.entitlements)
// oraz z WIDGET_APP_GROUP w lib/widget-shared.ts.
module.exports = {
  type: "widget",
  name: "Kaszuby24Widget",
  deploymentTarget: "16.1",
  entitlements: {
    "com.apple.security.application-groups": ["group.app.kaszuby24"],
  },
};
