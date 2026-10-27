const $=s=>document.querySelector(s), audio=$('#audio');let songs=[],current=null,view='home',searchId=0,shuffle=false,pendingSong=null,mediaKind='song';let playlists;try{playlists=JSON.parse(localStorage.getItem('flig-playlists'))||[{id:'favorites',name:'Liked songs',songs:[]}]}catch{playlists=[{id:'favorites',name:'Liked songs',songs:[]}]}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const saved=s=>playlists.some(p=>p.songs.some(x=>x.trackId===s.trackId));
function persist(){localStorage.setItem('flig-playlists',JSON.stringify(playlists));renderNav()}
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('visible');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2800)}
function renderNav(){$('#libraryCount').textContent=new Set(playlists.flatMap(p=>p.songs.map(s=>s.trackId))).size;$('#playlistNav').innerHTML=playlists.map(p=>`<button data-id="${esc(p.id)}"><span>♫</span>${esc(p.name)}</button>`).join('');$('#playlistNav').querySelectorAll('button').forEach(b=>b.onclick=()=>openPlaylist(b.dataset.id))}
function render(){ $('#songGrid').innerHTML=songs.length?songs.map((s,i)=>`<article class="song-card ${current?.trackId===s.trackId?'playing':''}" style="animation-delay:${Math.min(i,9)*35}ms"><div class="art-wrap"><img src="${esc(s.artworkUrl100?.replace('100x100bb','400x400bb'))}" alt="${esc(s.collectionName||s.trackName)}" loading="lazy"><button class="save-song" data-save="${i}" title="Save to playlist">${saved(s)?'♥':'♡'}</button><button class="card-play" data-play="${i}" title="${mediaKind==='podcast'?'Play full episode':'Play preview'}">${current?.trackId===s.trackId&&!audio.paused?'Ⅱ':'▶'}</button></div><h3 title="${esc(s.trackName)}">${esc(s.trackName)}</h3><p>${esc(s.artistName)}</p><div class="track-meta"><span>${mediaKind==='podcast'?'हिंदी कहानी · FULL EPISODE':'SONG · PREVIEW'}</span><span>${mediaKind==='podcast'?'EPISODE':s.trackTimeMillis?time(s.trackTimeMillis/1000):'—'}</span></div></article>`).join(''):`<div class="empty-state"><div style="font-size:35px">♫</div><h3>${view==='search'?'Nothing here just yet':'Your good-music collection starts here'}</h3><p>${view==='search'?'Try another song or artist.':'Tap the heart on a song to save it to a playlist.'}</p></div>`;document.querySelectorAll('[data-play]').forEach(b=>b.onclick=()=>play(songs[+b.dataset.play]));document.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>saveDialog(songs[+b.dataset.save]));}
async function fetchSearch(q){
 // GitHub Pages is static: use the provider's supported JSONP API.
 return new Promise((resolve,reject)=>{
  const callback='fligSearch_'+Date.now()+'_'+Math.floor(Math.random()*100000);
  const script=document.createElement('script');
  const cleanup=()=>{clearTimeout(timer);script.remove();delete window[callback]};
  const timer=setTimeout(()=>{cleanup();reject(new Error('Music provider timed out. Please try again.'))},20000);
  window[callback]=data=>{cleanup();Array.isArray(data.results)?resolve(data):reject(new Error('Invalid music response'))};
  script.onerror=()=>{cleanup();reject(new Error('Music provider could not be reached. Check your connection or content blocker.'))};
  script.src='https://itunes.apple.com/search?term='+encodeURIComponent(q)+'&entity='+ (mediaKind==='podcast'?'podcastEpisode':'song') +'&limit=30&country=IN&callback='+callback;
  document.head.appendChild(script);
 });
}

async function fetchHindiStories(){
 // Podcast RSS carries the publisher's complete episode audio, not a short music preview.
 const rss='https://anchor.fm/s/35198e00/podcast/rss';
 const api='https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent(rss);
 const res=await fetch(api); if(!res.ok) throw new Error('Podcast feed abhi load nahi hua.');
 const feed=await res.json(); if(!Array.isArray(feed.items)) throw new Error('Podcast feed ka response sahi nahi hai.');
 return feed.items.map((it,i)=>({trackId:'kahani-'+i,trackName:it.title||'Hindi kahani',artistName:'Kahani with Prachi · हिंदी कहानी',collectionName:'हिंदी कहानियाँ',artworkUrl100:feed.feed?.image||'https://is1-ssl.mzstatic.com/image/thumb/Podcasts116/v4/af/4d/6f/af4d6fca-9e54-a54a-f7be-b252304e6e4f/mza_17051702676268887661.jpg/600x600bb.jpg',episodeUrl:it.enclosure?.link||it.link,trackTimeMillis:0,description:it.description||''})).filter(x=>x.episodeUrl);
}
async function search(q){
 let id=++searchId;
 $('#status').textContent='Finding your next favorite…';$('#songGrid').innerHTML='';
 try{
  if(mediaKind==='podcast'){songs=await fetchHindiStories();if(id!==searchId)return;$('#status').textContent=songs.length?`${songs.length} हिंदी कहानी episodes · पूरा उपलब्ध audio`: 'कोई episode नहीं मिला';render();return;}
  const data=await fetchSearch(q);if(id!==searchId)return;
  songs=data.results.filter(s=>s.previewUrl || s.episodeUrl); 
  $('#status').textContent=songs.length?`${songs.length} sounds to get lost in`:'No matches. Try a different song or artist.';render();
 }catch(error){
  if(id!==searchId)return;
  $('#status').textContent='Music connection failed: '+error.message;
  $('#songGrid').innerHTML='<div class="empty-state"><h3>Music service se connection nahi ho pa raha</h3><p>Dobara try karein. Agar file preview khula hai, Live app mein kholein.</p><button id="retrySearch" class="dark-button">Retry search ↗</button></div>';
  $('#retrySearch').onclick=()=>search(q);
 }
}

function setView(v,title){view=v;$('#homeIntro').hidden=v!=='home';$('#crumb').textContent=title;document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.view===v));$('#seeAll').hidden=v!=='home';$('#searchForm').hidden=!(v==='home'||v==='search');$('#sectionEyebrow').textContent=v==='home'?'A FRESH ROTATION':v==='search'?'FIND YOUR NEXT FAVORITE':'YOUR PERSONAL ROTATION';$('#sectionTitle').textContent=v==='home'?'Made for your kind of day':title;$('#status').textContent=''}
function openPlaylist(id){searchId++;let p=playlists.find(p=>p.id===id);setView('playlist',p.name);songs=[...p.songs];render();window.scrollTo({top:0,behavior:'smooth'})}
async function play(s){if(current?.trackId===s.trackId){if(audio.paused)audio.play().catch(()=>toast('Tap play to listen.'));else audio.pause();return}current=s;audio.src=s.episodeUrl||s.previewUrl;$('#nowArt').innerHTML=`<img src="${esc(s.artworkUrl100)}" alt="Album cover">`;$('#nowTitle').textContent=s.trackName;$('#nowArtist').textContent=s.artistName;$('#nowSave').textContent=saved(s)?'♥':'♡';render();try{await audio.play()}catch{toast('This preview could not play. Try another song.')}}
function step(d){if(!songs.length)return;let i=songs.findIndex(s=>s.trackId===current?.trackId);play(songs[shuffle?Math.floor(Math.random()*songs.length):(i+d+songs.length)%songs.length])}
function saveDialog(s){pendingSong=s;$('#dialogTitle').textContent=s?'Save to playlist':'Make it your own';$('#playlistChoices').innerHTML=s?playlists.map(p=>`<button data-list="${esc(p.id)}">♫ &nbsp; ${esc(p.name)} <span style="float:right">${p.songs.some(x=>x.trackId===s.trackId)?'✓ Saved':'+'}</span></button>`).join(''):'';$('#playlistChoices').querySelectorAll('button').forEach(b=>b.onclick=()=>{let p=playlists.find(x=>x.id===b.dataset.list);if(p.songs.some(x=>x.trackId===s.trackId)){p.songs=p.songs.filter(x=>x.trackId!==s.trackId);toast('Removed from '+p.name)}else{p.songs.push(s);toast('Saved to '+p.name)}persist();$('#playlistDialog').close();render();if(current)$('#nowSave').textContent=saved(current)?'♥':'♡'});$('#playlistDialog').showModal()}
$('#createForm').onsubmit=e=>{e.preventDefault();let name=$('#playlistName').value.trim();if(!name)return;let p={id:'p'+Date.now(),name,songs:pendingSong?[pendingSong]:[]};playlists.push(p);persist();$('#playlistName').value='';$('#playlistDialog').close();toast(pendingSong?'Song saved to '+name:'Playlist created');render()};$('#newPlaylist').onclick=()=>saveDialog(null);$('#nowSave').onclick=()=>current?saveDialog(current):toast('Pick a song first');$('#searchForm').onsubmit=e=>{e.preventDefault();let q=$('#searchInput').value.trim();if(!q)return;setView('search','Search results');search(q)};
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{if(b.dataset.view==='home'){setView('home','Discover');search('chill indie')}else if(b.dataset.view==='search'){setView('search','Search');songs=[];render();$('#searchInput').focus()}else{searchId++;setView('library','Your library');songs=[...new Map(playlists.flatMap(p=>p.songs).map(s=>[s.trackId,s])).values()];render()}});document.querySelectorAll('.mood').forEach(b=>b.onclick=()=>{document.querySelectorAll('.mood').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');search(b.dataset.query)});$('#explore').onclick=()=>{$('#musicSection').scrollIntoView({behavior:'smooth'});$('#searchInput').focus({preventScroll:true})};$('#seeAll').onclick=()=>{setView('search','Discover more');$('#searchInput').value='popular hits';search('popular hits');window.scrollTo({top:0,behavior:'smooth'})};$('#playPause').onclick=()=>current?(audio.paused?audio.play().catch(()=>toast('Unable to play this preview.')):audio.pause()):songs.length?play(songs[0]):toast('Search for a song to start listening');$('#next').onclick=()=>step(1);$('#prev').onclick=()=>step(-1);$('#shuffle').onclick=()=>{shuffle=!shuffle;$('#shuffle').classList.toggle('on',shuffle);toast('Shuffle '+(shuffle?'on':'off'))};$('#repeat').onclick=()=>{audio.loop=!audio.loop;$('#repeat').classList.toggle('on',audio.loop);toast('Repeat '+(audio.loop?'on':'off'))};audio.volume=.7;$('#volume').oninput=e=>audio.volume=e.target.value;audio.onplay=()=>{$('#playPause').textContent='Ⅱ';render()};audio.onpause=()=>{$('#playPause').textContent='▶';render()};audio.onended=()=>step(1);audio.onerror=()=>toast('Preview unavailable. Try another track.');const time=t=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');audio.ontimeupdate=()=>{$('#elapsed').textContent=time(audio.currentTime);$('#seek').value=audio.duration?audio.currentTime/audio.duration*100:0};audio.onloadedmetadata=()=>$('#duration').textContent=time(audio.duration);$('#seek').oninput=e=>{if(audio.duration)audio.currentTime=e.target.value/100*audio.duration};document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();$('#searchInput').focus()}});$('#playlistDialog').onclick=e=>{if(e.target===$('#playlistDialog'))$('#playlistDialog').close()};// Browser-local demo account (not a real user-management backend).
const authDialog=$('#authDialog');let account;try{account=JSON.parse(localStorage.getItem('flig-user'))}catch{}
function paintAccount(){if(account){$('#authButton').textContent='Hi, '+(account.name||account.email.split('@')[0]);$('.avatar.mini').textContent=(account.name||account.email)[0].toUpperCase()} }
paintAccount();$('#authButton').onclick=()=>{if(account){if(confirm('Log out of this browser?')){localStorage.removeItem('flig-user');account=null;$('#authButton').textContent='Log in / Sign up';$('.avatar.mini').textContent='Y'}}else authDialog.showModal()};$('#closeAuth').onclick=()=>authDialog.close();$('#authForm').onsubmit=e=>{e.preventDefault();account={name:$('#authName').value.trim(),email:$('#authEmail').value.trim()};localStorage.setItem('flig-user',JSON.stringify(account));paintAccount();authDialog.close();toast('Signed in on this device')};
const podcastNav=document.querySelector('[data-view="podcasts"]');podcastNav.onclick=()=>{mediaKind='podcast';setView('search','हिंदी कहानियाँ');$('#searchInput').placeholder='हिंदी कहानी पॉडकास्ट';$('#searchInput').value='कहानी';search('कहानी')};document.querySelectorAll('.nav:not([data-view="podcasts"])').forEach(b=>b.addEventListener('click',()=>{mediaKind='song';$('#searchInput').placeholder='Search songs, artists, or a little inspiration…'}));
renderNav();search('chill indie');
// Search as you type; Enter and the Search button also work.
let searchDebounce;
$('#searchInput').addEventListener('input',()=>{
 clearTimeout(searchDebounce);
 const q=$('#searchInput').value.trim();
 if(!q){searchId++;$('#status').textContent='Type a song or artist name to search.';return;}
 if(q.length<2)return;
 searchDebounce=setTimeout(()=>{setView('search','Search results');search(q)},450);
});
$('#searchForm').addEventListener('submit',()=>clearTimeout(searchDebounce));
