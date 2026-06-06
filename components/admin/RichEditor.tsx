import React, { useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface Props {
  value: string;
  onChange: (html: string) => void;
  minHeight?: number;
  isDark?: boolean;
  primaryColor?: string;
}

const buildEditorHtml = (isDark: boolean, primary: string) => {
  const bg = isDark ? '#1e293b' : '#ffffff';
  const text = isDark ? '#f1f5f9' : '#1e293b';
  const toolbarBg = isDark ? '#0f172a' : '#f8fafc';
  const border = isDark ? '#334155' : '#e2e8f0';
  const btnBg = isDark ? '#1e293b' : '#ffffff';
  const btnText = isDark ? '#f1f5f9' : '#1e293b';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const colorScheme = isDark ? 'dark' : 'light';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
  <meta name="color-scheme" content="${colorScheme}">
  <meta name="supported-color-schemes" content="${colorScheme}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root { color-scheme: ${colorScheme}; }
    *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
    html,body{
      background:${bg} !important;
      color:${text} !important;
      font-family:'Poppins','Helvetica Neue',-apple-system,sans-serif !important;
    }
    .toolbar{
      display:flex;flex-wrap:wrap;gap:4px;padding:8px 10px;
      background:${toolbarBg};border-bottom:1px solid ${border};
      position:sticky;top:0;z-index:10;
    }
    .btn{
      padding:5px 10px;border:1px solid ${border};border-radius:6px;
      background:${btnBg};color:${btnText} !important;font-size:13px;
      font-family:'Poppins',sans-serif;font-weight:500;
      cursor:pointer;min-width:34px;text-align:center;
      user-select:none;-webkit-user-select:none;
    }
    .btn.active{background:${primary};color:#fff !important;border-color:${primary};}
    .sep{width:1px;background:${border};margin:2px 4px;}
    #editor{
      min-height:220px;padding:14px 12px;outline:none;
      font-family:'Poppins','Helvetica Neue',sans-serif !important;
      font-size:15px;line-height:1.75;
      color:${text} !important;
      background:${bg} !important;
      word-break:break-word;
    }
    #editor:empty:before{
      content:attr(data-placeholder);color:${muted} !important;
      pointer-events:none;font-style:italic;
    }
    #editor h2{font-size:20px;font-weight:700;margin:14px 0 6px;line-height:1.3;color:${text} !important;}
    #editor h3{font-size:17px;font-weight:600;margin:12px 0 5px;line-height:1.3;color:${text} !important;}
    #editor p{margin:0 0 10px;color:${text} !important;}
    #editor ul,#editor ol{padding-left:22px;margin:8px 0 10px;}
    #editor li{margin:3px 0;color:${text} !important;}
    #editor a{color:${primary} !important;text-decoration:underline;}
    #editor blockquote{
      border-left:3px solid ${border};padding:4px 0 4px 12px;
      color:${muted} !important;margin:10px 0;font-style:italic;
    }
    #editor strong{font-weight:700;color:${text} !important;}
    #editor em{font-style:italic;color:${text} !important;}
    #editor hr{border:none;border-top:1px solid ${border};margin:14px 0;}
    /* Disable Android forced dark mode invert */
    @media (forced-colors: active){
      *{forced-color-adjust:none !important;}
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="btn" id="btn-bold" onclick="fmt('bold')"><b>B</b></button>
    <button class="btn" id="btn-italic" onclick="fmt('italic')"><i>I</i></button>
    <div class="sep"></div>
    <button class="btn" id="btn-h2" onclick="fmtBlock('h2')">H2</button>
    <button class="btn" id="btn-h3" onclick="fmtBlock('h3')">H3</button>
    <button class="btn" id="btn-p"  onclick="fmtBlock('p')">¶</button>
    <div class="sep"></div>
    <button class="btn" id="btn-ul" onclick="fmt('insertUnorderedList')">•—</button>
    <button class="btn" id="btn-ol" onclick="fmt('insertOrderedList')">1.</button>
    <button class="btn" id="btn-bq" onclick="fmtBlock('blockquote')">"</button>
    <div class="sep"></div>
    <button class="btn" onclick="insertLink()">🔗</button>
    <button class="btn" onclick="fmt('removeFormat')">✕</button>
  </div>
  <div id="editor" contenteditable="true" spellcheck="true" data-placeholder="Zacznij pisać..."></div>

<script>
  var editor = document.getElementById('editor');
  var lastHtml = '';

  function post(obj){
    try{ window.ReactNativeWebView.postMessage(JSON.stringify(obj)); }catch(e){}
  }

  function sendContent(){
    var html = editor.innerHTML;
    if(html !== lastHtml){ lastHtml = html; post({type:'content', html:html}); }
  }

  function fmt(cmd){
    document.execCommand(cmd, false, null);
    editor.focus();
    updateToolbar();
    sendContent();
  }

  function fmtBlock(tag){
    document.execCommand('formatBlock', false, '<'+tag+'>');
    editor.focus();
    updateToolbar();
    sendContent();
  }

  function insertLink(){
    var sel = window.getSelection();
    var selectedText = sel && sel.toString() ? sel.toString() : '';
    post({type:'promptLink', selectedText:selectedText});
  }

  function applyLink(url, text){
    editor.focus();
    if(text && window.getSelection().toString()===''){
      document.execCommand('insertHTML', false,
        '<a href="'+url+'">'+text+'</a>');
    } else {
      document.execCommand('createLink', false, url);
    }
    sendContent();
  }

  function updateToolbar(){
    var cmds=['bold','italic'];
    cmds.forEach(function(c){
      var btn=document.getElementById('btn-'+c);
      if(btn) btn.className='btn'+(document.queryCommandState(c)?' active':'');
    });
    var block=(document.queryCommandValue('formatBlock')||'').toLowerCase().replace(/[<>]/g,'');
    ['h2','h3','p'].forEach(function(t){
      var btn=document.getElementById('btn-'+t);
      if(btn) btn.className='btn'+(block===t?' active':'');
    });
    ['ul','ol'].forEach(function(t){
      var cmd=t==='ul'?'insertUnorderedList':'insertOrderedList';
      var btn=document.getElementById('btn-'+t);
      if(btn) btn.className='btn'+(document.queryCommandState(cmd)?' active':'');
    });
  }

  editor.addEventListener('input', sendContent);
  editor.addEventListener('keyup', updateToolbar);
  editor.addEventListener('mouseup', updateToolbar);
  editor.addEventListener('touchend', updateToolbar);

  function sendHeight(){
    var h = document.body.scrollHeight;
    post({type:'height', height: h});
  }

  editor.addEventListener('input', sendHeight);

  if (typeof ResizeObserver !== 'undefined') {
    var ro = new ResizeObserver(sendHeight);
    ro.observe(document.body);
  }

  function handleMessage(raw){
    try{
      var msg = JSON.parse(raw);
      if(msg.type==='setContent'){
        editor.innerHTML = msg.html || '';
        lastHtml = editor.innerHTML;
        setTimeout(sendHeight, 80);
      }
      if(msg.type==='applyLink'){
        applyLink(msg.url, msg.text||'');
      }
      if(msg.type==='focus'){
        editor.focus();
      }
    }catch(e){}
  }

  document.addEventListener('message', function(e){ handleMessage(e.data); });
  window.addEventListener('message', function(e){ handleMessage(e.data); });

  // Notify ready
  setTimeout(function(){ post({type:'ready'}); }, 100);
</script>
</body>
</html>`;
};

export default function RichEditor({ value, onChange, minHeight = 280, isDark = false, primaryColor = '#224A96' }: Props) {
  const webViewRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const pendingContent = useRef<string | null>(value);

  useEffect(() => {
    pendingContent.current = value;
  }, []);

  const sendContentToWebView = useCallback((html: string) => {
    webViewRef.current?.postMessage(JSON.stringify({ type: 'setContent', html }));
  }, []);

  const onLoad = useCallback(() => {
    if (pendingContent.current !== null) {
      sendContentToWebView(pendingContent.current);
      pendingContent.current = null;
    }
  }, [sendContentToWebView]);

  const [editorHeight, setEditorHeight] = React.useState(minHeight);

  const onMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'content') {
        onChange(msg.html);
      }
      if (msg.type === 'height') {
        const h = Math.max(minHeight, msg.height + 8);
        setEditorHeight(h);
      }
      if (msg.type === 'ready') {
        readyRef.current = true;
        if (pendingContent.current !== null) {
          sendContentToWebView(pendingContent.current);
          pendingContent.current = null;
        }
      }
      if (msg.type === 'promptLink') {
        const { Alert } = require('react-native');
        Alert.prompt(
          'Wstaw link',
          'Podaj adres URL:',
          (url: string) => {
            if (url?.trim()) {
              webViewRef.current?.postMessage(JSON.stringify({
                type: 'applyLink',
                url: url.trim(),
                text: msg.selectedText || '',
              }));
            }
          },
          'plain-text',
          '',
          'url'
        );
      }
    } catch { /* ignore */ }
  }, [onChange, minHeight, sendContentToWebView]);

  const html = buildEditorHtml(isDark, primaryColor);
  const bgColor = isDark ? '#1e293b' : '#ffffff';

  return (
    <View style={[styles.container, { height: editorHeight, backgroundColor: bgColor }]}>
      <WebView
        ref={webViewRef}
        source={{ html, baseUrl: 'https://kaszuby24.pl' }}
        onLoadEnd={onLoad}
        onMessage={onMessage}
        scrollEnabled={false}
        style={[styles.webview, { backgroundColor: bgColor }]}
        nestedScrollEnabled
        allowsInlineMediaPlayback
        keyboardDisplayRequiresUserAction={false}
        forceDarkOn={false}
        androidLayerType="hardware"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', overflow: 'hidden', borderRadius: 10 },
  webview: { flex: 1 },
});
