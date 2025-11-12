// Programmatic config update API
window.setConfigFromCode = function(newCfg){
  if(typeof newCfg!=='object'||!newCfg){console.error('newCfg must be object');return false;}
  if(!window.appConfig){window.appConfig={};}
  Object.assign(window.appConfig,newCfg);
  if(typeof window.renderConfigUI==='function'){try{window.renderConfigUI(window.appConfig);}catch(_){}}
  console.info('[config] updated from code', window.appConfig);
  return true;
};
window.downloadConfig = function(filename='config.json'){
  const data = JSON.stringify(window.appConfig||{},null,2);
  const blob = new Blob([data],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
};
function clampAccessoriesPercent(v){v=Number(v)||0;if(v<0)return 0;if(v>100)return 100;return v;}
import './style.css'
import javascriptLogo from './javascript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.js'

document.querySelector('#app').innerHTML = `
  <div>
    <a href="https://vitejs.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank">
      <img src="${javascriptLogo}" class="logo vanilla" alt="JavaScript logo" />
    </a>
    <h1>Hello Vite!</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Click on the Vite logo to learn more
    </p>
  </div>
`

setupCounter(document.querySelector('#counter'))
