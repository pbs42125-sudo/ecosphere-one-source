(() => {
  const pageTitles = {home:"Home",dashboard:"Dashboard","digital-twin":"3D Digital Twin","campus-tour":"360° Campus Tour",waste:"Smart Waste Management",energy:"Energy Intelligence",water:"Water Intelligence",ecoadvisor:"EcoAdvisor AI",reports:"Reports & Export"};
  const pages = [...document.querySelectorAll(".page")];
  function navigate(page) {
    if (!pageTitles[page]) page = "home";
    pages.forEach(p => p.classList.toggle("active", p.id === "page-" + page));
    document.querySelectorAll("[data-page]").forEach(a => a.classList.toggle("active", a.dataset.page === page));
    document.getElementById("topTitle").textContent = pageTitles[page];
    if (location.hash !== "#" + page) history.pushState({page}, "", "#" + page);
    document.getElementById("sidebar").classList.remove("open");
    window.scrollTo({top:0,behavior:"smooth"});
    if (page === "digital-twin") setTimeout(resizeThree, 80);
    if (page === "dashboard") drawCharts();
  }
  document.querySelectorAll("[data-page]").forEach(a => a.addEventListener("click", e => {e.preventDefault();navigate(a.dataset.page)}));
  document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => navigate(b.dataset.go)));
  window.addEventListener("popstate", () => navigate(location.hash.slice(1) || "home"));
  document.getElementById("mobileMenu").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
  document.getElementById("resetDemo").addEventListener("click", () => {drawCharts();alert("Demo view refreshed. No live campus sensors are connected.");});
  navigate(location.hash.slice(1) || "home");

  function makeBars(target, values, blue=false) {
    const el = document.getElementById(target); if(!el) return;
    el.innerHTML = "";
    const max = Math.max(...values);
    values.forEach((v,i) => {
      const bar = document.createElement("div"); bar.className = "bar" + (blue ? " blue-bar" : "");
      bar.style.height = Math.max(8, v/max*100) + "%";
      const label = document.createElement("span"); label.textContent = ["M","T","W","T","F","S","S"][i%7]; bar.appendChild(label);
      bar.title = `${v} ${blue?"litres":"kWh"} (demo)`; el.appendChild(bar);
    });
  }
  function drawCharts() {
    const range = document.getElementById("dateRange")?.value || "30";
    const multiplier = range === "today" ? .22 : range === "7" ? .55 : 1;
    makeBars("energyChart",[55,70,62,84,75,91,67,80,58,73,87,68].map(v=>Math.round(v*multiplier)));
    makeBars("waterChart",[48,59,53,72,63,79,58,68,51,75,64,82].map(v=>Math.round(v*multiplier)),true);
  }
  document.getElementById("dateRange").addEventListener("change", drawCharts); drawCharts();

  // 3D conceptual campus model using Three.js
  let scene, camera, renderer, campusGroup, raycaster, pointer, dragging=false, moved=false, prev={x:0,y:0}, yaw=.65, pitch=.75, zoom=1, selected="Academic Block A";
  const buildings = [];
  const layerObjects = {energy:[],water:[],waste:[],lights:[]};
  function addBuilding(name, x,z,w,d,h,color,desc,energy,water,occ,status) {
    const geo = new THREE.BoxGeometry(w,h,d);
    const mat = new THREE.MeshStandardMaterial({color,roughness:.78});
    const mesh = new THREE.Mesh(geo,mat); mesh.position.set(x,h/2,z); mesh.userData={name,desc,energy,water,occ,status}; campusGroup.add(mesh); buildings.push(mesh);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w*1.04,.12,d*1.04),new THREE.MeshStandardMaterial({color:0x477b64,roughness:.8}));
    roof.position.set(x,h+.05,z); roof.userData={...mesh.userData}; campusGroup.add(roof); buildings.push(roof);
    const windowMat = new THREE.MeshStandardMaterial({color:0x8acbb0,roughness:.4});
    for(let floor=0;floor<Math.max(2,Math.floor(h/1.15));floor++){
      for(let col=0;col<Math.max(2,Math.floor(w/1.0));col++){
        const win=new THREE.Mesh(new THREE.BoxGeometry(.28,.25,.035),windowMat);
        win.position.set(x-w/2+.55+col*(w-.8)/Math.max(1,Math.floor(w/1.0)-1),.65+floor*1.05,z+d/2+.02);
        win.userData={...mesh.userData};campusGroup.add(win);buildings.push(win);
      }
    }
    if(status==="alert"){
      const marker=new THREE.Mesh(new THREE.SphereGeometry(.23,16,12),new THREE.MeshStandardMaterial({color:0xe75b62,emissive:0x6d1015}));
      marker.position.set(x,h+1,z);marker.userData={...mesh.userData};campusGroup.add(marker);
    }
    const energyMarker=new THREE.Mesh(new THREE.SphereGeometry(.18,12,8),new THREE.MeshStandardMaterial({color:status==="alert"?0xe65a62:0x29a36a,emissive:status==="alert"?0x551015:0x0b3822}));
    energyMarker.position.set(x,h+.6,z-d/2-.4);energyMarker.userData={...mesh.userData};campusGroup.add(energyMarker);layerObjects.energy.push(energyMarker);
  }
  function addTree(x,z,s=1) {
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.11*s,.16*s,.8*s,7),new THREE.MeshStandardMaterial({color:0x8d6b4c}));
    trunk.position.set(x,.4*s,z);campusGroup.add(trunk);
    const crown=new THREE.Mesh(new THREE.SphereGeometry(.55*s,10,8),new THREE.MeshStandardMaterial({color:0x61b782,roughness:1}));
    crown.position.set(x,1*s,z);campusGroup.add(crown);
  }
  function addMarker(x,z,color,kind) {
    const m=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.45,12),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.13}));
    m.position.set(x,.25,z);m.userData={kind};campusGroup.add(m);layerObjects[kind].push(m);
  }
  function initThree() {
    const host=document.getElementById("threeCanvas"); if(!host || !window.THREE) {document.getElementById("canvasFallback").textContent="3D library unavailable. Check your internet connection and reload.";return;}
    scene=new THREE.Scene();scene.background=new THREE.Color(0xeaf6ef);scene.fog=new THREE.Fog(0xeaf6ef,25,65);
    camera=new THREE.PerspectiveCamera(43,host.clientWidth/host.clientHeight,.1,100);camera.position.set(13,13,17);
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.8));renderer.setSize(host.clientWidth,host.clientHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xffffff,0x91b69f,2));
    const sun=new THREE.DirectionalLight(0xffffff,2.1);sun.position.set(10,20,8);sun.castShadow=true;scene.add(sun);
    campusGroup=new THREE.Group();scene.add(campusGroup);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(42,34),new THREE.MeshStandardMaterial({color:0xd8ebdd,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.08;ground.receiveShadow=true;campusGroup.add(ground);
    const roadMat=new THREE.MeshStandardMaterial({color:0xbacdc1,roughness:1});
    const road=new THREE.Mesh(new THREE.BoxGeometry(37,.035,2.1),roadMat);road.position.set(0,.01,5.2);campusGroup.add(road);
    const road2=new THREE.Mesh(new THREE.BoxGeometry(2,.04,29),roadMat);road2.position.set(-7,.015,0);campusGroup.add(road2);
    addBuilding("Academic Block A",-4,-4,5,4,5.2,0xf3f8f4,"Teaching and classroom zone",420,1850,68,"alert");
    addBuilding("Academic Block B",3,-5,4.2,3.8,4.2,0xe6f2e9,"Laboratory and classroom zone",310,1320,42,"normal");
    addBuilding("Library",8,1,4.2,4,3.6,0xf8f5e9,"Library and study zone",190,820,26,"normal");
    addBuilding("Administration",-1,3,4.5,3.4,3.8,0xe8f4ee,"Administrative zone",230,970,18,"normal");
    addBuilding("Cafeteria",5,7,4.2,3.2,3.1,0xf4e9d8,"Dining and waste collection zone",260,1400,35,"attention");
    addBuilding("Laboratory",-11,-1,3.6,3.5,4.1,0xe2edf4,"Laboratory zone",290,1110,22,"attention");
    for(let i=0;i<12;i++){addTree(-16+(i%6)*5.7,-11+Math.floor(i/6)*2.1,.75+(i%3)*.13);}
    for(let i=0;i<7;i++){addTree(-15+i*4.5,10+(i%2)*1.4,.7+(i%3)*.12);}
    addMarker(6,8,0xe6a43b,"waste");addMarker(-2,-7,0x3296bd,"water");addMarker(9,-4,0xe6a43b,"waste");addMarker(-10,2,0x3296bd,"water");
    // virtual lamp posts
    for(const [x,z] of [[-10,5],[0,5],[9,5],[-7,-9],[4,-9]]){
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(.045,.06,1.7,7),new THREE.MeshStandardMaterial({color:0x6c8b7a}));pole.position.set(x,.85,z);campusGroup.add(pole);
      const bulb=new THREE.Mesh(new THREE.SphereGeometry(.14,10,8),new THREE.MeshStandardMaterial({color:0xffe6a1,emissive:0xffd16b,emissiveIntensity:.8}));bulb.position.set(x,1.75,z);campusGroup.add(bulb);layerObjects.lights.push(bulb);
    }
    raycaster=new THREE.Raycaster();pointer=new THREE.Vector2();
    renderer.domElement.addEventListener("pointerdown",e=>{dragging=true;moved=false;prev={x:e.clientX,y:e.clientY};});
    window.addEventListener("pointerup",()=>dragging=false);
    renderer.domElement.addEventListener("pointermove",e=>{if(!dragging)return;const dx=e.clientX-prev.x,dy=e.clientY-prev.y;if(Math.abs(dx)+Math.abs(dy)>2)moved=true;yaw+=dx*.008;pitch=Math.max(.18,Math.min(1.35,pitch+dy*.006));prev={x:e.clientX,y:e.clientY};});
    renderer.domElement.addEventListener("wheel",e=>{zoom=Math.max(.55,Math.min(1.8,zoom+e.deltaY*.0008));e.preventDefault();},{passive:false});
    renderer.domElement.addEventListener("click",e=>{if(moved)return;const r=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(buildings);if(hits.length){const d=hits[0].object.userData;if(d.name)selectBuilding(d);}});
    document.getElementById("canvasFallback").style.display="none";
    document.getElementById("resetCamera").addEventListener("click",()=>{yaw=.65;pitch=.75;zoom=1;});
    ["energy","water","waste"].forEach(kind=>document.getElementById(kind+"Layer").addEventListener("change",e=>layerObjects[kind].forEach(o=>o.visible=e.target.checked)));
    document.getElementById("lightsToggle").addEventListener("change",e=>{layerObjects.lights.forEach(o=>o.visible=e.target.checked);document.getElementById("savingValue").textContent=e.target.checked?"0.0 kWh/day":"2.16 kWh/day";});
    const animate=()=>{requestAnimationFrame(animate);const target=new THREE.Vector3(0,0,0);const distance=25*zoom;camera.position.set(target.x+Math.sin(yaw)*distance,Math.max(5,Math.sin(pitch)*distance),target.z+Math.cos(yaw)*distance);camera.lookAt(target);renderer.render(scene,camera);};animate();
    window.addEventListener("resize",resizeThree);
  }
  function selectBuilding(d){selected=d.name;document.getElementById("buildingName").textContent=d.name;document.getElementById("buildingDesc").textContent=d.desc;document.getElementById("buildingEnergy").textContent=d.energy+" kWh";document.getElementById("buildingWater").textContent=d.water+" L";document.getElementById("buildingOccupancy").textContent=d.occ+" demo people";}
  function resizeThree(){const host=document.getElementById("threeCanvas");if(renderer&&camera&&host&&host.clientWidth){renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();}}
  if(window.THREE)initThree();else document.getElementById("canvasFallback").textContent="3D library unavailable. Connect to the internet and reload.";

  // Energy saving calculator
  const lightCount=document.getElementById("lightCount"),wattage=document.getElementById("wattage"),hours=document.getElementById("hours");
  function calcEnergy(){const n=+lightCount.value,w=+wattage.value,h=+hours.value;document.getElementById("lightCountLabel").textContent=n;document.getElementById("wattLabel").textContent=w+" W";document.getElementById("hoursLabel").textContent=h+" hours";const kwh=n*w*h/1000;document.getElementById("energySaving").textContent=kwh.toFixed(2)+" kWh/day";document.getElementById("costSaving").textContent="₹"+(kwh*8.5).toFixed(2)+"/day at demo tariff ₹8.50/kWh";}
  [lightCount,wattage,hours].forEach(el=>el.addEventListener("input",calcEnergy));calcEnergy();

  // Waste upload demo
  let hasImage=false;const fileInput=document.getElementById("wasteImage");
  fileInput.addEventListener("change",()=>{const file=fileInput.files[0];if(!file)return;if(!file.type.startsWith("image/")){alert("Please select an image file.");return;}const img=document.getElementById("imagePreview");img.src=URL.createObjectURL(file);img.classList.remove("hidden");hasImage=true;document.getElementById("wasteResult").classList.add("hidden");});
  document.getElementById("analyzeWaste").addEventListener("click",()=>{const box=document.getElementById("wasteResult");box.classList.remove("hidden");box.innerHTML=hasImage?"<b>Demo analysis only</b><br>Image uploaded successfully. No computer-vision model is connected, so this prototype cannot genuinely classify the image. Suggested next step: connect a vision model to return a verified waste category and confidence score.":"Choose an image first. This demo does not pretend to perform real AI classification.";});

  // Local water observations
  const STORE="ecosphere-water-observations-v1";
  function readWater(){try{return JSON.parse(localStorage.getItem(STORE)||"[]")}catch{return[]}}
  function renderWater(){const list=document.getElementById("waterRecords"),rows=readWater();if(!rows.length){list.innerHTML='<div class="empty-state">No manually entered observations yet.</div>';return;}list.innerHTML=rows.slice().reverse().map(r=>`<div class="record-item"><div><b>${escapeHtml(r.zone)}</b><br><span>${escapeHtml(r.date)}</span></div><b>${Number(r.litres).toLocaleString()} L</b></div>`).join("");}
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  document.getElementById("waterDate").value=new Date().toISOString().slice(0,10);
  document.getElementById("waterForm").addEventListener("submit",e=>{e.preventDefault();const rows=readWater();rows.push({zone:document.getElementById("waterZone").value.trim(),litres:+document.getElementById("waterReading").value,date:document.getElementById("waterDate").value});localStorage.setItem(STORE,JSON.stringify(rows));renderWater();document.getElementById("waterMessage").textContent="Observation saved in this browser. It is not a live meter reading.";e.target.reset();document.getElementById("waterDate").value=new Date().toISOString().slice(0,10);});renderWater();

  // Rule-based EcoAdvisor
  function answer(q){q=q.toLowerCase();if(q.includes("electric")||q.includes("energy")||q.includes("light"))return"Start by collecting timestamped energy readings and occupancy observations. Investigate rooms that appear unoccupied while energy use remains elevated. The dashboard figures are simulated, so verify with actual meters before making operational decisions.";if(q.includes("waste")||q.includes("recycl")||q.includes("plastic"))return"Place clearly labelled bins for organic, paper, plastic/metal and general waste. Keep paper dry, track waste weights by zone, and review contamination rates. A genuine image classifier must be connected before this site can classify uploaded waste photos.";if(q.includes("water")||q.includes("leak"))return"Record meter readings with zone and timestamp. Flag unexpected increases against a configurable baseline, then ask facilities staff to inspect the area. A reading anomaly suggests a possible leak; it does not prove one.";if(q.includes("carbon"))return"Estimated carbon emissions can be calculated from measured electricity use and a documented emission factor. This demo uses illustrative figures. Replace them with verified campus readings and an appropriate published factor before reporting real emissions.";if(q.includes("demo")||q.includes("metric")||q.includes("data"))return"The dashboard uses sample values to demonstrate the interface. They are not live DSU data. The 360° tour is an external visual reference; no readings are extracted from it. Use manual entry or CSV import after a data collection workflow is established.";return"Useful first steps are to measure baseline energy and water use, record waste by category, and attach a timestamp and campus zone to every observation. I can provide rule-based guidance in this prototype; a generative AI service is not connected."}
  function addChat(text,who){const b=document.createElement("div");b.className="chat-bubble "+who;b.textContent=text;document.getElementById("chatLog").appendChild(b);document.getElementById("chatLog").scrollTop=99999;}
  document.getElementById("chatForm").addEventListener("submit",e=>{e.preventDefault();const input=document.getElementById("chatInput"),q=input.value.trim();if(!q)return;addChat(q,"user");addChat(answer(q),"bot");input.value="";});
  document.querySelectorAll("[data-question]").forEach(b=>b.addEventListener("click",()=>{const q=b.dataset.question;addChat(q,"user");addChat(answer(q),"bot");}));

  // CSV exports
  function download(name,content,type="text/csv"){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();URL.revokeObjectURL(a.href);}
  document.getElementById("exportCsv").addEventListener("click",()=>download("ecosphere-one-demo-dashboard.csv","Metric,Value,Unit,Source\nElectricity,38896,kWh,Simulated demo data\nWater,173045,litres,Simulated demo data\nWaste,441,kg,Simulated demo data\nRecycling rate,73,percent,Simulated demo data\nCarbon emissions,27616,kg CO2e,Calculated from demo assumptions\nEstimated avoided carbon,3314,kg CO2e,Simulated estimate\n"));
  document.getElementById("exportWater").addEventListener("click",()=>{const rows=readWater();const csv="Zone,Litres,Date\n"+rows.map(r=>[r.zone,r.litres,r.date].map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(",")).join("\n");download("ecosphere-one-water-observations.csv",csv);});
})();