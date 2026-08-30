import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

const { width } = Dimensions.get('window');

/**
 * Osadzenia redakcyjne z pola custom_html (mapy, formularze, widżety).
 * Renderujemy w WebView, bo to dowolny HTML ze skryptami; wysokość
 * dopasowuje się do zawartości przez pomiar w środku strony.
 */
export const ArticleCustomHtml = ({ html, isDarkMode }: { html: string; isDarkMode: boolean }) => {
  const [height, setHeight] = useState(220);

  const source = useMemo(
    () => ({
      html: `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  html,body{margin:0;padding:0;background:transparent;color:${isDarkMode ? '#f2f2f7' : '#1a1a1a'};
    font-family:-apple-system,Roboto,sans-serif;font-size:15px;line-height:1.6;overflow-x:hidden;}
  img,iframe,video{max-width:100%;height:auto;border:0;display:block;}
  a{color:#224A96;}
  table{width:100%;border-collapse:collapse;}
</style></head><body>${html}
<script>
  function report(){
    var h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(String(h));
  }
  window.addEventListener('load', report);
  setTimeout(report, 300); setTimeout(report, 1200); setTimeout(report, 3000);
  if (window.ResizeObserver) { new ResizeObserver(report).observe(document.body); }
</script></body></html>`,
      baseUrl: 'https://kaszuby24.pl',
    }),
    [html, isDarkMode],
  );

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        source={source}
        style={styles.web}
        originWhitelist={['*']}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
        onMessage={(event) => {
          const h = parseInt(event.nativeEvent.data, 10);
          if (h && h > 40 && Math.abs(h - height) > 8) setHeight(Math.min(h + 8, 2400));
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { width: width - 40, marginTop: 16, overflow: 'hidden', borderRadius: 10 },
  web: { flex: 1, backgroundColor: 'transparent' },
});

export default ArticleCustomHtml;
