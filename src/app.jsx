const {useState,useRef,useEffect}=React;

// ── Supabase ──────────────────────────────────
const SB_URL="https://clidlcwqpddzgjgjznea.supabase.co";
const SB_KEY="sb_publishable_4Fyvj0W8RGpzTHhwcgnzSA_9tAjFQ-0";
// 관리자 비밀번호는 빌드 시 env(ADMIN_PW)로 주입 — 소스/깃에 남기지 않음.
// ⚠️ 클라이언트 게이트는 편의용일 뿐, 실제 데이터 보안은 Supabase RLS가 담당해야 함 (docs/SECURITY.md 참고)
const ADMIN_PW=(typeof __ADMIN_PW__!=="undefined"&&__ADMIN_PW__)?__ADMIN_PW__:null;

// ── 쿠팡 파트너스 ────────────────────────────
const COUPANG_AF_ID="AF7478113";
let CL_MAP={};
const coupangUrl=(k)=>{
  if(CL_MAP&&CL_MAP[k])return CL_MAP[k];
  const q=encodeURIComponent(k);
  return `https://www.coupang.com/np/search?q=${q}&sourceType=affiliate&affiliate=Y&subId=recipe&clickTracking=Y&af_id=${COUPANG_AF_ID}`;
};
const sbFetch=(p,o={})=>fetch(`${SB_URL}/rest/v1/${p}`,{headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`,...(o.headers||{})},...o});

// ── 번역 ─────────────────────────────────────
const TR_CACHE={};
const _TR_SEP=' |||SEP||| ';
const _TR_SEPR=/\s*\|\|\|SEP\|\|\|\s*/;
async function trBatch(texts,target){
  const key=`${target}|${texts.join('§')}`;
  if(TR_CACHE[key])return TR_CACHE[key];
  const joined=texts.join(_TR_SEP);
  let result=texts;
  try{
    const r=await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=${target}&dt=t&q=${encodeURIComponent(joined)}`);
    const data=await r.json();
    const merged=data[0].map(x=>x[0]).join('');
    result=merged.split(_TR_SEPR);
    if(result.length!==texts.length){
      result=[];
      for(const t of texts){
        try{
          const rr=await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=${target}&dt=t&q=${encodeURIComponent(t)}`);
          const dd=await rr.json();
          result.push(dd[0].map(x=>x[0]).join(''));
        }catch{result.push(t);}
      }
    }
  }catch{}
  TR_CACHE[key]=result;
  return result;
}

// ── 카테고리/배지 토큰 ─────────────────────────
const CAT_C=(id)=>`var(--c${id})`;
const CAT_S=(id)=>`var(--c${id}-soft)`;
const CAT_EMOJI={1:'🍲',2:'🍱',3:'🥢',4:'🍼',5:'🍝',6:'🍜',7:'🥗'};
const BADGE_CLASS={
  인기:'badge-primary',건강:'badge-success',간단:'badge-primary',정통:'badge-warn',
  고급:'badge-warn',시그니처:'badge-warn',강추:'badge-primary',특선:'badge-warn',
  매운맛:'badge-warn',신선:'badge-success',시원함:'badge-primary',겨울:'badge-primary',
  여름:'badge-primary',브런치:'badge-warn',와인:'badge-warn',
  초기:'badge-success',중기:'badge-success',후기:'badge-success',완료기:'badge-success',
  명절:'badge-warn',준비중:'badge-mute'
};
const DIFF=["","쉬움","보통","보통+","어려움","고급"];
const LS={get:(k,fb)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):fb;}catch{return fb;}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}}};
const Icon=({name,size=20,color})=>React.createElement('iconify-icon',{icon:name,style:{fontSize:size,color:color||'currentColor',display:'inline-flex'}});

// 한글 IME 안전 입력 — 검색탭에서 이미 검증된 패턴 그대로
// (line 966~970 <input ref={searchRef} onCompositionStart/End + onInput) 과 동일 구조
// - value prop 안 줌 (uncontrolled) → React가 native value를 강제 동기화하지 않음
// - 초기값/외부 변경은 defaultValue로 첫 마운트 시 1회 적용
//   (모달이 editModal && (...) 조건부라 열 때마다 새로 마운트되어 새 defaultValue 적용)
// - onCompositionStart/End로 한글 조합 중에는 setState 보류
// - onInput으로 조합 끝난 뒤·영문 입력 시에만 setState (검색탭과 정확히 동일)
const ImeInput=({value,onChange,multi,...rest})=>{
  const composingRef=React.useRef(false);
  const Tag=multi?'textarea':'input';
  return React.createElement(Tag,{
    defaultValue:value,
    onCompositionStart:()=>{composingRef.current=true;},
    onCompositionEnd:e=>{composingRef.current=false;onChange(e.target.value);},
    onInput:e=>{if(!composingRef.current)onChange(e.target.value);},
    autoComplete:'off',
    autoCapitalize:'none',
    autoCorrect:'off',
    ...rest
  });
};

const Stars=({v,onChange,size=18})=>(
  <span className="stars" style={{fontSize:size}}>
    {[1,2,3,4,5].map(s=>(
      <span key={s} className={`star ${s<=v?'on':'off'}${onChange?' clickable':''}`} onClick={()=>onChange?.(s)}>★</span>
    ))}
  </span>
);

function App(){
  const [db,setDb]=useState(null);
  const [loading,setLoading]=useState(true);
  const [cat,setCat]=useState(null);
  const [dish,setDish]=useState(null);
  const [recipe,setRecipe]=useState(null);
  const [step,setStep]=useState(null);
  const [tab,setTab]=useState("home");
  const [query,setQuery]=useState("");
  const [favs,setFavs]=useState(()=>LS.get("spa_favs",[]));
  const [ratings,setRatings]=useState(()=>LS.get("spa_ratings",{}));
  const [editModal,setEditModal]=useState(null);
  const [editValue,setEditValue]=useState("");
  const [editReason,setEditReason]=useState("");
  const [editSending,setEditSending]=useState(false);
  const [editDone,setEditDone]=useState(false);
  const [editError,setEditError]=useState("");
  const [adminUnlocked,setAdminUnlocked]=useState(()=>LS.get("spa_admin_unlock",false));
  const [adminMode,setAdminMode]=useState(()=>LS.get("spa_admin_unlock",false));
  const [adminPw,setAdminPw]=useState("");
  const [adminRequests,setAdminRequests]=useState([]);
  const [adminLoading,setAdminLoading]=useState(false);
  const [reviewModal,setReviewModal]=useState(null);
  const [draftStar,setDraftStar]=useState(0);
  const [draftNote,setDraftNote]=useState("");
  const [user,setUser]=useState(()=>LS.get("spa_user",null));
  const [welcomed,setWelcomed]=useState(()=>LS.get("spa_welcomed",false));
  // 번역 상태를 App 레벨로 승격 — RecipeDetail이 매 렌더 remount돼도 번역이 유지됨 (B1 수정)
  const [trLang,setTrLang]=useState(null);
  const [trData,setTrData]=useState(null);
  const [trLoading,setTrLoading]=useState(false);
  const dismissWelcome=()=>{setWelcomed(true);LS.set("spa_welcomed",true);};
  const searchRef=useRef(null);
  const composingRef=useRef(false);

  const loadDb=React.useCallback(()=>{
    setLoading(true);
    fetch("./coupang_links.json").then(r=>r.ok?r.json():{}).then(m=>{CL_MAP=m||{};}).catch(()=>{})
      .finally(()=>{
        fetch("./recipes.json").then(r=>{if(!r.ok)throw new Error("http "+r.status);return r.json();})
          .then(data=>{
            // 스키마 가드: 200 OK이지만 cats/dishes/recipes가 손상된 경우도 에러 화면으로 (흰 화면 크래시 방지)
            if(!data||!Array.isArray(data.cats)||!data.dishes||!data.recipes){setDb(null);return;}
            setDb(data);
          }).catch(()=>setDb(null)).finally(()=>setLoading(false));
      });
  },[]);
  useEffect(()=>{loadDb();},[loadDb]);
  // 노트북 unlock: ?admin_setup=KEY → localStorage 저장 + URL 정리
  useEffect(()=>{
    try{
      const u=new URL(window.location.href);
      if(ADMIN_PW&&u.searchParams.get('admin_setup')===ADMIN_PW){
        LS.set("spa_admin_unlock",true);
        setAdminUnlocked(true);
        setAdminMode(true);
        u.searchParams.delete('admin_setup');
        window.history.replaceState({},'',u.toString());
      }
    }catch{}
  },[]);
  useEffect(()=>{LS.set("spa_favs",favs);},[favs]);
  useEffect(()=>{LS.set("spa_ratings",ratings);},[ratings]);
  useEffect(()=>{LS.set("spa_user",user);},[user]);
  // 다른 레시피로 이동하면 번역 초기화 (이전 레시피의 번역이 남지 않도록)
  useEffect(()=>{setTrLang(null);setTrData(null);setTrLoading(false);},[recipe]);
  // Kakao SDK 초기화
  useEffect(()=>{
    if(window.Kakao && !window.Kakao.isInitialized()){
      try{window.Kakao.init("35497f25325d1cf8a2435621b8b0dd25");}catch(e){console.error("Kakao.init 실패",e);}
    }
  },[]);
  // 카카오 OAuth redirect 복귀 처리 (URL에 ?code=… 있으면 토큰 교환 + 사용자 정보 저장)
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const code=params.get('code');
    const error=params.get('error');
    if(error){
      alert("카카오에서 거부됨: "+(params.get('error_description')||error));
      window.history.replaceState({},'',window.location.pathname);return;
    }
    if(!code)return;
    (async()=>{
      try{
        const tokenRes=await fetch('https://kauth.kakao.com/oauth/token',{
          method:'POST',
          headers:{'Content-Type':'application/x-www-form-urlencoded'},
          body:new URLSearchParams({
            grant_type:'authorization_code',
            client_id:"35497f25325d1cf8a2435621b8b0dd25",
            redirect_uri:window.location.origin+"/",
            code:code
          })
        });
        const tokenData=await tokenRes.json();
        if(!tokenData.access_token){
          alert("토큰 교환 실패: "+(tokenData.error_description||tokenData.error||JSON.stringify(tokenData)));
          window.history.replaceState({},'',window.location.pathname);return;
        }
        // 직접 카카오 API 호출 (SDK 2.x의 Kakao.API.request는 success/fail 옵션 deprecated)
        const meRes=await fetch('https://kapi.kakao.com/v2/user/me',{
          headers:{'Authorization':'Bearer '+tokenData.access_token}
        });
        const me=await meRes.json();
        if(!me.id){
          alert("사용자 정보 조회 실패: "+(me.msg||JSON.stringify(me)));
          window.history.replaceState({},'',window.location.pathname);return;
        }
        const profile=me.kakao_account?.profile||{};
        const kakaoUser={
          kakao_id:String(me.id),
          nickname:profile.nickname||me.properties?.nickname||'카카오 사용자',
          profile_image_url:profile.profile_image_url||me.properties?.profile_image||'',
          thumbnail_image_url:profile.thumbnail_image_url||me.properties?.thumbnail_image||'',
        };
        try{
          await sbFetch('users?on_conflict=kakao_id',{
            method:'POST',
            headers:{'Prefer':'resolution=merge-duplicates,return=minimal'},
            body:JSON.stringify({...kakaoUser,last_login_at:new Date().toISOString()})
          });
        }catch(e){console.error("Supabase upsert 실패",e);}
        setUser(kakaoUser);
        setWelcomed(true);LS.set("spa_welcomed",true);
        window.history.replaceState({},'',window.location.pathname);
      }catch(e){
        alert("로그인 처리 중 오류: "+(e.message||JSON.stringify(e)));
        window.history.replaceState({},'',window.location.pathname);
      }
    })();
  },[]);
  // 카카오 OAuth 인가 요청 - 직접 redirect (SDK authorize() 의존성 제거)
  // iOS Safari·PWA·구형 브라우저 모두에서 가장 robust한 방식
  const handleKakaoLogin=()=>{
    const params=new URLSearchParams({
      response_type:'code',
      client_id:'35497f25325d1cf8a2435621b8b0dd25',
      redirect_uri:window.location.origin+'/',
      scope:'profile_nickname,profile_image'
    });
    const authUrl='https://kauth.kakao.com/oauth/authorize?'+params.toString();
    // 페이지 전체를 카카오 로그인으로 이동 (popup 아님, 안전)
    window.location.href=authUrl;
  };
  const handleKakaoLogout=()=>{
    const done=()=>setUser(null);
    if(window.Kakao?.Auth?.getAccessToken()){window.Kakao.Auth.logout(done);}
    else{done();}
  };

  if(loading)return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",flexDirection:"column",gap:10,background:"var(--card)"}}>
      <p style={{fontSize:26,fontWeight:800,color:"var(--text-strong)",letterSpacing:"-.03em"}}>오늘 뭐먹지</p>
      <p style={{fontSize:13,color:"var(--text-mute)"}}>레시피 불러오는 중...</p>
    </div>
  );
  if(!db)return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:24}}>
      <div style={{background:"var(--card)",borderRadius:"var(--radius-lg)",padding:28,textAlign:"center",maxWidth:360,boxShadow:"var(--shadow-sm)"}}>
        <div style={{fontSize:48,marginBottom:12}}>⚠️</div>
        <h2 style={{fontSize:18,fontWeight:700,marginBottom:8,color:"var(--text-strong)"}}>레시피를 불러오지 못했습니다</h2>
        <p style={{fontSize:13,color:"var(--text-sub)",marginBottom:20}}>네트워크 연결을 확인하고 다시 시도해주세요.</p>
        <button onClick={loadDb} className="btn btn-primary" style={{padding:"12px 28px",flex:"initial"}}>다시 시도</button>
      </div>
    </div>
  );

  // 첫 진입 시 환영 화면 (로그인 또는 둘러보기 선택 전까지)
  if(!user && !welcomed) return(
    <div className="welcome">
      <div className="welcome-emoji">🍲</div>
      <h1 className="welcome-title">오늘 뭐먹지</h1>
      <p className="welcome-sub">130가지 검증된 레시피<br/>오늘 메뉴를 골라보세요</p>
      <button onClick={handleKakaoLogin} className="kakao-btn welcome-kakao">
        <Icon name="ri:kakao-talk-fill" size={20}/>
        카카오톡으로 시작하기
      </button>
      <button onClick={dismissWelcome} className="welcome-skip">로그인 없이 둘러보기</button>
    </div>
  );

  const {cats,dishes,recipes}=db;
  // 조리 단계가 있는(=완성된) 음식만 노출 — '준비중' 빈 레시피(예: 마라전골)는 목록/검색/카운트에서 제외
  const dishReady=(d)=>(recipes[d.id]||[]).some(r=>Array.isArray(r.steps)&&r.steps.length>0);
  const dishesOf=(cid)=>(dishes[cid]||[]).filter(dishReady);
  const allDishes=Object.entries(dishes).flatMap(([cid,arr])=>arr.filter(dishReady).map(d=>({...d,catId:Number(cid)})));
  const allRecipes=Object.entries(recipes).flatMap(([did,arr])=>arr.map(r=>({...r,dishId:Number(did)})));
  const getCat=(id)=>cats.find(c=>c.id===id)||cats[0];
  const activeCat=cats.find(c=>c.id===cat);
  const activeDish=dish?allDishes.find(d=>d.id===dish):null;
  const activeRecipe=recipe?allRecipes.find(r=>r.id===recipe):null;
  const accentC=activeCat?CAT_C(activeCat.id):'var(--primary)';
  const accentS=activeCat?CAT_S(activeCat.id):'var(--primary-soft)';
  const isFav=(id)=>favs.includes(id);
  const toggleFav=(id)=>setFavs(f=>{const n=f.includes(id)?f.filter(x=>x!==id):[...f,id];LS.set("spa_favs",n);return n;});
  const openReview=(id)=>{const rv=ratings[id];setDraftStar(rv?.star||0);setDraftNote(rv?.note||"");setReviewModal(id);};
  // 번역 핸들러 (App 레벨) — activeRecipe를 캡처. 상태도 App 레벨이라 remount에도 유지됨
  const LANGS=[{code:'en',label:'English'},{code:'ja',label:'日本語'},{code:'zh-CN',label:'中文'}];
  const handleTr=async(lang)=>{
    const r=activeRecipe;if(!r)return;
    if(trLang===lang){setTrLang(null);setTrData(null);return;}
    setTrLoading(true);setTrLang(lang);setTrData(null);
    try{
      const ingNames=(r.ing||[]).map(i=>i.n);
      const texts=[r.title,...ingNames,...(r.steps||[])];
      const translated=await trBatch(texts,lang);
      if(translated.length===texts.length){
        const trTitle=translated[0]||r.title;
        const trIng=r.ing.map((i,idx)=>({...i,n:translated[1+idx]||i.n}));
        const trSteps=translated.slice(1+ingNames.length);
        setTrData({title:trTitle,ing:trIng,steps:trSteps.length===r.steps.length?trSteps:r.steps});
      }
    }catch{}
    setTrLoading(false);
  };
  const saveReview=()=>{const n={...ratings,[reviewModal]:{star:draftStar,note:draftNote}};setRatings(n);LS.set("spa_ratings",n);setReviewModal(null);};
  const favRecipes=favs.map(id=>allRecipes.find(r=>r.id===id)).filter(Boolean);
  const searchResults=query.trim().length>=1?allDishes.filter(d=>d.name.includes(query.trim())):[];
  const openDish=(d)=>{setCat(d.catId);setDish(d.id);setRecipe(null);setStep(null);setTab("home");};
  const openDishSmart=(d)=>{
    const rs=recipes[d.id]||[];
    setCat(d.catId||cat);setDish(d.id);setStep(null);setTab("home");
    setRecipe(rs.length===1?rs[0].id:null);
  };
  const openRecipe=(r)=>{setRecipe(r.id);setStep(null);setTab("home");};
  const goBack=()=>{
    if(activeRecipe){
      const single=(recipes[activeRecipe.dishId]||[]).length===1;
      setRecipe(null);setStep(null);
      if(single)setDish(null);
    }
    else if(activeDish)setDish(null);
    else if(activeCat)setCat(null);
  };
  const breadcrumb=[activeCat?.name,activeDish?.name,activeRecipe?.title].filter(Boolean);
  const inNav=tab==="home"&&(cat||dish||recipe);

  const openEdit=(r)=>{
    const ing=Array.isArray(r.ing)?r.ing:[];
    setEditModal({recipe:r,field:"ingredients",original:ing});
    setEditValue(ing.map(i=>`${i.n}: ${i.a}`).join("\n"));
    setEditReason("");setEditError("");setEditDone(false);
  };
  const submitEdit=async()=>{
    if(!editValue.trim()||!editModal)return;
    setEditError("");setEditSending(true);
    try{
      await sbFetch("edit_requests",{
        method:"POST",headers:{"Prefer":"return=minimal"},
        body:JSON.stringify({
          dish_id:editModal.recipe.dishId,recipe_id:editModal.recipe.id,
          dish_name:allDishes.find(d=>d.id===editModal.recipe.dishId)?.name||"",
          recipe_title:editModal.recipe.title,field:editModal.field,
          original_value:Array.isArray(editModal.original)?editModal.original.map(i=>i&&typeof i==="object"?`${i.n}: ${i.a}`:String(i)).join("\n"):String(editModal.original||""),
          suggested_value:editValue.trim(),reason:editReason.trim(),status:"pending"
        })
      });
      setEditDone(true);
    }catch{setEditError("전송에 실패했습니다. 네트워크를 확인하고 다시 시도해주세요.");}
    setEditSending(false);
  };

  const loginAdmin=()=>{
    if(!ADMIN_PW){alert("관리자 비밀번호가 설정되지 않았습니다 (빌드 환경변수 ADMIN_PW 필요).");return;}
    if(adminPw===ADMIN_PW){setAdminMode(true);loadAdminRequests();}
    else alert("비밀번호가 틀렸습니다.");
  };
  const loadAdminRequests=async()=>{
    setAdminLoading(true);
    try{
      const r=await sbFetch("edit_requests?order=created_at.desc&select=*");
      const data=await r.json();
      setAdminRequests(Array.isArray(data)?data:[]);
    }catch{}
    setAdminLoading(false);
  };
  const updateRequest=async(id,status)=>{
    await sbFetch(`edit_requests?id=eq.${id}`,{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({status})});
    loadAdminRequests();
  };

  // ── RecipeCard ─────────────────────────────
  const RecipeCard=({r})=>{
    const cls=r.badge?BADGE_CLASS[r.badge]||'badge-primary':'';
    const rv=ratings[r.id];
    return(
      <div onClick={()=>openRecipe(r)} className="recipe-card">
        <div className="recipe-bar" style={{background:accentC}}/>
        <div className="recipe-body">
          <div className="recipe-head">
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span className="recipe-title">{r.title}</span>
                {r.badge&&<span className={`badge ${cls}`}>{r.badge}</span>}
              </div>
              {r.desc&&<p className="recipe-desc">{r.desc}</p>}
              <div className="recipe-meta">
                {r.time>0&&<span className="meta-item"><Icon name="solar:clock-circle-bold" size={14}/>{r.time}분</span>}
                {r.diff>0&&<span className="meta-item"><Icon name="solar:fire-bold" size={14}/>{DIFF[r.diff]}</span>}
                {r.author&&<span className="meta-item"><Icon name="solar:user-bold" size={14}/>{r.author}</span>}
                {rv&&<Stars v={rv.star} size={13}/>}
              </div>
            </div>
            <button onClick={e=>{e.stopPropagation();toggleFav(r.id);}} className={`fav-btn ${isFav(r.id)?'on':''}`}>
              {isFav(r.id)?'❤':'♡'}
            </button>
          </div>
          {rv?.note&&<div className="review-note">📝 {rv.note}</div>}
        </div>
      </div>
    );
  };

  // ── RecipeDetail ───────────────────────────
  const RecipeDetail=()=>{
    const r=activeRecipe;if(!r)return null;
    const rv=ratings[r.id];
    const cls=r.badge?BADGE_CLASS[r.badge]||'badge-primary':'';
    // trLang/trData/trLoading/handleTr/LANGS는 App 레벨에서 내려옴 (B1 수정 — remount에도 번역 유지)
    const _d=trData||r;
    const disp={..._d,ing:Array.isArray(_d.ing)?_d.ing:[],steps:Array.isArray(_d.steps)?_d.steps:[]};
    return(
      <div className="fade">
        {/* 번역 */}
        <div className="lang-row">
          <span className="lang-lbl">번역</span>
          {LANGS.map(({code,label})=>(
            <button key={code} onClick={()=>handleTr(code)} disabled={trLoading} className={`lang-btn ${trLang===code?'on':''}`}>{label}</button>
          ))}
          {trLoading&&<span className="lang-clear">번역 중...</span>}
          {trLang&&!trLoading&&<button onClick={()=>{setTrLang(null);setTrData(null);}} className="lang-clear">원문</button>}
        </div>
        {/* Hero */}
        <div className="detail-hero">
          <div className="detail-hero-bar" style={{background:accentC}}/>
          <div className="detail-hero-top">
            {r.badge?<span className={`badge ${cls}`}>{r.badge}</span>:<span/>}
            <button onClick={()=>openReview(r.id)} className="review-cta">
              <Icon name={rv?'solar:pen-bold':'solar:star-bold'} size={14}/>{rv?'후기 수정':'후기 남기기'}
            </button>
          </div>
          <h2 className="detail-title">{disp.title||r.title}</h2>
          {r.desc&&<p className="detail-desc">{r.desc}</p>}
          {rv&&(
            <div className="review-card">
              <div className="review-row"><Stars v={rv.star} size={15}/></div>
              {rv.note&&<p className="review-note-text">"{rv.note}"</p>}
            </div>
          )}
          <div className="detail-stats">
            <div className="stat">
              <div className="stat-val">{r.time>0?`${r.time}분`:'-'}</div>
              <div className="stat-lbl">소요</div>
            </div>
            <div className="stat">
              <div className="stat-val">{r.diff>0?`${r.diff}/5`:'-'}</div>
              <div className="stat-lbl">난이도</div>
            </div>
            <div className="stat">
              <div className="stat-val" style={{fontSize:13}}>{r.author||'-'}</div>
              <div className="stat-lbl">작성자</div>
            </div>
          </div>
          {r.source&&r.source.startsWith("http")&&(
            <a href={r.source} target="_blank" rel="noopener noreferrer" className="source-btn">
              <Icon name="solar:videocamera-record-bold" size={16}/>원본 레시피 보기
            </a>
          )}
        </div>

        {/* 재료 */}
        {disp.ing.length>0&&(
          <>
            <div className="section-head">
              <h3 className="section-title"><Icon name="solar:salt-bold" size={18}/>재료</h3>
              <button onClick={()=>openEdit(r)} className="edit-chip"><Icon name="solar:pen-bold" size={12}/>수정 제안</button>
            </div>
            <div className="ing-list">
              {disp.ing.map((ing,i)=>{
                const origName=r.ing[i]?.n||ing.n;
                return(
                  <a key={i} href={coupangUrl(origName)} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="ing-row" style={{cursor:'pointer'}}>
                    <span className="ing-name">{ing.n}</span>
                    <span className="ing-amount">{ing.a}</span>
                  </a>
                );
              })}
            </div>
            <p className="partner-note">이 사이트는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.</p>
          </>
        )}

        {/* 조리 순서 */}
        {disp.steps.length>0&&(
          <>
            <div className="section-head">
              <h3 className="section-title"><Icon name="solar:chef-hat-bold" size={18}/>조리 순서</h3>
            </div>
            <div className="step-list">
              {disp.steps.map((s,i)=>{
                const n=i+1;
                return(
                  <div key={i} onClick={()=>setStep(step===n?null:n)} className={`step ${step===n?'on':''}`}>
                    <div className="step-row">
                      <div className="step-num">{n}</div>
                      <p className="step-text">{s}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* 즐겨찾기 CTA */}
        <button onClick={()=>toggleFav(r.id)} className={`fav-cta ${isFav(r.id)?'on':''}`}>
          <Icon name={isFav(r.id)?"solar:heart-broken-bold":"solar:heart-bold"} size={18}/>
          {isFav(r.id)?'즐겨찾기 해제':'즐겨찾기 추가'}
        </button>
      </div>
    );
  };

  // ── HomeContent ────────────────────────────
  const HomeContent=()=>{
    if(activeRecipe)return<RecipeDetail/>;
    if(dish){
      const list=recipes[dish]||[];
      return(
        <div className="fade">
          <p className="list-count">{list.length}가지 레시피</p>
          {list.length>0?list.map(r=><RecipeCard key={r.id} r={r}/>):
            <div className="empty"><div className="empty-emoji">🔜</div><p className="empty-title">레시피 준비 중</p></div>}
        </div>
      );
    }
    if(cat){
      const list=dishesOf(cat);
      return(
        <div className="fade">
          <p className="list-count">{list.length}가지 요리</p>
          <div className="dish-card">
            {list.map(d=>(
              <div key={d.id} onClick={()=>openDishSmart(d)} className="dish-row" style={{cursor:'pointer'}}>
                <div className="dish-bar" style={{background:accentC}}/>
                <div className="dish-text">
                  <div className="dish-name">{d.name}</div>
                  {recipes[d.id]&&<div className="dish-sub">{recipes[d.id].length}가지 레시피</div>}
                </div>
                <Icon name="solar:alt-arrow-right-line-duotone" size={18} color="var(--text-mute)"/>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return(
      <div className="fade">
        <div className="cat-grid">
          {cats.map(c=>(
            <div key={c.id} onClick={()=>setCat(c.id)} className="cat-card" style={{cursor:'pointer'}}>
              <div className="cat-emoji">{CAT_EMOJI[c.id]||c.e||'🍽️'}</div>
              <div className="cat-bot">
                <span className="cat-chip" style={{background:CAT_S(c.id),color:CAT_C(c.id)}}>{dishesOf(c.id).length}가지</span>
                <span className="cat-name">{c.name}</span>
              </div>
            </div>
          ))}
        </div>
        {favRecipes.length>0&&(
          <div>
            <div className="section-title-row">
              <h3 className="section-title"><Icon name="solar:heart-bold" size={18} color="var(--danger)"/>최근 즐겨찾기</h3>
              <button onClick={()=>setTab("favs")} className="section-more">전체 보기</button>
            </div>
            {favRecipes.slice(-3).reverse().map(r=>{
              const d=allDishes.find(d=>recipes[d.id]?.some(x=>x.id===r.id));
              const cid=d?.catId||1;
              return(
                <div key={r.id} onClick={()=>openRecipe(r)} className="mini-fav" style={{cursor:'pointer'}}>
                  <div className="mini-dot" style={{background:CAT_S(cid)}}>{CAT_EMOJI[cid]||'🍽️'}</div>
                  <div className="mini-text">
                    <div className="mini-name">{r.title}</div>
                    <div className="mini-meta">{r.time>0?`${r.time}분`:'-'}</div>
                  </div>
                  {ratings[r.id]&&<Stars v={ratings[r.id].star} size={13}/>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ── 검색 결과 ───────────────────────────────
  const SearchResults=()=>(
    <>
      {query.trim().length>=1?(
        <>
          <p className="list-count">{searchResults.length>0?`"${query}" 검색 결과 ${searchResults.length}건`:`"${query}"에 해당하는 음식이 없습니다`}</p>
          <div className="search-list">
            {searchResults.map(d=>{
              const c=getCat(d.catId);
              return(
                <div key={d.id} onClick={()=>openDish(d)} className="search-card" style={{cursor:'pointer'}}>
                  <div className="search-icon-circle" style={{background:CAT_S(d.catId)}}>{CAT_EMOJI[d.catId]||'🍽️'}</div>
                  <div className="search-text">
                    <div className="search-name">{d.name}</div>
                    <div className="search-sub">
                      <span>{c.name}</span><span className="dot">·</span><span>{(recipes[d.id]||[]).length}가지 레시피</span>
                    </div>
                  </div>
                  <Icon name="solar:alt-arrow-right-line-duotone" size={18} color="var(--text-mute)"/>
                </div>
              );
            })}
          </div>
        </>
      ):(
        <>
          <p className="section-quick">자주 찾는 음식</p>
          <div className="chip-row">
            {["닭갈비","굴배춧국","바지락술찜","감바스","세비체","뽈뽀","항정살","두부김치","팟타이","까망베르","뱅쇼","크림관자","육회","오므라이스","중화냉면","굴튀김"].map(w=>(
              <button key={w} onClick={()=>{setQuery(w);if(searchRef.current)searchRef.current.value=w;}} className="chip">{w}</button>
            ))}
          </div>
        </>
      )}
    </>
  );

  // ── 즐겨찾기 탭 ─────────────────────────────
  const FavsTab=()=>(
    <div className="fade">
      <h2 className="tab-h-title">즐겨찾기</h2>
      <p className="tab-h-sub">내가 저장한 레시피 모음</p>
      {!user?(
        <div className="login-card">
          <p className="login-card-title">카카오톡으로 로그인</p>
          <p className="login-card-sub">로그인하면 닉네임·프로필이 표시되고<br/>다른 기기에서도 동기화할 수 있어요</p>
          <button onClick={handleKakaoLogin} className="kakao-btn">
            <Icon name="ri:kakao-talk-fill" size={20}/>
            카카오톡으로 시작하기
          </button>
        </div>
      ):(
        <div className="profile-card">
          {user.thumbnail_image_url?
            <img src={user.thumbnail_image_url} className="profile-img" alt={user.nickname}/>:
            <div className="profile-img-fallback">👤</div>}
          <div className="profile-text">
            <div className="profile-name">{user.nickname||'카카오 사용자'}</div>
            <div className="profile-meta">카카오 로그인됨</div>
          </div>
          <button onClick={handleKakaoLogout} className="logout-btn">로그아웃</button>
        </div>
      )}
      {favRecipes.length===0?(
        <div className="empty">
          <div className="empty-emoji">🤍</div>
          <p className="empty-title">아직 저장된 레시피가 없어요</p>
          <p className="empty-sub">레시피에서 하트 버튼을 눌러보세요</p>
        </div>
      ):favRecipes.map(r=>{
        const d=allDishes.find(d=>recipes[d.id]?.some(x=>x.id===r.id));
        const c=d?getCat(d.catId):cats[0];
        const rv=ratings[r.id];
        return(
          <div key={r.id} onClick={()=>openRecipe(r)} className="fav-card" style={{cursor:'pointer'}}>
            <div className="fav-bar" style={{background:CAT_C(d?.catId||1)}}/>
            <div className="fav-body">
              <div className="fav-row1">
                <span className="fav-cat-tag">{c.name}</span>
                {rv&&<Stars v={rv.star} size={12}/>}
              </div>
              <div className="fav-name">{r.title}</div>
              <div className="fav-meta">{r.time>0?`${r.time}분`:'-'} · {DIFF[r.diff]||'-'}</div>
              {rv?.note&&<p className="fav-note-text">"{rv.note}"</p>}
            </div>
            <button onClick={e=>{e.stopPropagation();toggleFav(r.id);}} className="fav-rm">♥</button>
          </div>
        );
      })}
    </div>
  );

  // ── 관리자 탭 ──────────────────────────────
  const AdminTab=()=>(
    <div className="fade">
      <h2 className="tab-h-title">관리자</h2>
      {!adminMode?(
        <div className="admin-login">
          <p style={{fontSize:14,color:"var(--text-sub)",marginBottom:14}}>관리자 비밀번호를 입력하세요</p>
          <input type="password" value={adminPw} onChange={e=>setAdminPw(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&loginAdmin()} placeholder="비밀번호" className="input" style={{marginBottom:10}}/>
          <button onClick={loginAdmin} className="btn btn-primary" style={{width:"100%",flex:"initial"}}>로그인</button>
        </div>
      ):(
        <div>
          <div className="admin-toolbar">
            <p className="admin-tip">수정 요청 목록</p>
            <button onClick={loadAdminRequests} className="admin-refresh"><Icon name="solar:refresh-bold" size={14}/>새로고침</button>
          </div>
          {adminLoading?<div className="empty"><p className="empty-title">로딩 중...</p></div>:
          adminRequests.length===0?<div className="empty"><div className="empty-emoji">📭</div><p className="empty-title">수정 요청이 없습니다</p></div>:
          adminRequests.map(req=>{
            const cls=req.status==="pending"?"badge-warn":req.status==="approved"?"badge-success":"badge-mute";
            const label=req.status==="pending"?"대기중":req.status==="approved"?"승인됨":"거절됨";
            return(
              <div key={req.id} className="req-card">
                <div className="req-head">
                  <span className="req-title">{req.recipe_title}</span>
                  <span className={`badge ${cls}`}>{label}</span>
                </div>
                <div className="req-meta">
                  <span className="req-field">{req.field}</span>{new Date(req.created_at).toLocaleDateString("ko-KR")}
                </div>
                {req.original_value&&<div className="req-orig">기존: {req.original_value.substring(0,100)}{req.original_value.length>100?"...":""}</div>}
                <div className="req-new">수정안: {req.suggested_value}</div>
                {req.reason&&<div className="req-reason">이유: {req.reason}</div>}
                {req.status==="pending"&&(
                  <div className="req-actions">
                    <button onClick={()=>updateRequest(req.id,"approved")} className="req-btn ok"><Icon name="solar:check-circle-bold" size={14}/>승인</button>
                    <button onClick={()=>updateRequest(req.id,"rejected")} className="req-btn no"><Icon name="solar:close-circle-bold" size={14}/>거절</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── 네비게이션 바 ──────────────────────────
  const NavBar=()=>(
    <div className="navbar">
      {[
        {key:"home",label:"홈",icon:"solar:home-2-bold"},
        {key:"search",label:"검색",icon:"solar:magnifer-bold"},
        {key:"favs",label:`즐겨찾기${favs.length>0?` ${favs.length}`:""}`,icon:"solar:heart-bold"},
        ...(adminUnlocked?[{key:"admin",label:"관리자",icon:"solar:shield-user-bold"}]:[]),
      ].map(n=>(
        <button key={n.key} onClick={()=>{setTab(n.key);if(n.key==="home"){setCat(null);setDish(null);setRecipe(null);setStep(null);}if(n.key==="search")setTimeout(()=>searchRef.current?.focus(),100);}} className={`nav-item ${tab===n.key?'on':''}`}>
          <span className="nav-icon"><Icon name={n.icon} size={22}/></span>
          <span className="nav-label">{n.label}</span>
          <span className="nav-dot"/>
        </button>
      ))}
    </div>
  );

  // EditModal/ReviewModal: App 안 함수형 컴포넌트로 두면 매 setState→리렌더마다
  // 새 함수 reference로 unmount/remount되며 ImeInput이 새로 마운트되어 한 글자만 입력되고
  // 커서가 사라짐. → return JSX에 직접 인라인하여 검색탭과 동일한 안정성 확보.

  return(
    <div className="app">
      <div className="header">
        {inNav?(
          <div className="h-nav">
            <button onClick={goBack} className="h-back"><Icon name="solar:alt-arrow-left-line-duotone" size={22}/></button>
            <div style={{flex:1,minWidth:0}}>
              <div className="h-crumb">{breadcrumb.join(" › ")}</div>
              <h1 className="h-current">{activeRecipe?activeRecipe.title:activeDish?activeDish.name:activeCat?activeCat.name:""}</h1>
            </div>
          </div>
        ):(
          <div className="h-row">
            <div>
              <h1 className="h-title">{tab==="search"?"검색":tab==="favs"?"즐겨찾기":tab==="admin"?"관리자":"오늘 뭐먹지"}</h1>
              {tab==="home"&&<p className="h-sub">레시피 컬렉션</p>}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              {user&&(user.thumbnail_image_url?
                <img src={user.thumbnail_image_url} className="h-profile" alt={user.nickname} onClick={()=>setTab("favs")}/>:
                <div className="h-profile" style={{display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,cursor:'pointer'}} onClick={()=>setTab("favs")}>👤</div>
              )}
              {tab==="home"&&(
                <button onClick={()=>setTab("search")} className="h-icon-btn"><Icon name="solar:magnifer-line-duotone" size={20}/></button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="main">
        {tab==="home"&&<HomeContent/>}
        {tab==="search"&&(
          <div className="fade">
            <h2 className="search-h-title">검색</h2>
            <p className="search-h-sub">음식 이름으로 바로 찾기</p>
            <div className="search-box">
              <span className="search-icon"><Icon name="solar:magnifer-line-duotone" size={20}/></span>
              <input ref={searchRef}
                onCompositionStart={()=>{composingRef.current=true;}}
                onCompositionEnd={e=>{composingRef.current=false;setQuery(e.target.value);}}
                onInput={e=>{if(!composingRef.current)setQuery(e.target.value);}}
                placeholder="닭갈비, 감바스, 마라샹궈..." className="search-input"/>
              {query&&<button onClick={()=>{setQuery("");if(searchRef.current)searchRef.current.value="";}} className="search-clear"><Icon name="solar:close-circle-bold" size={18}/></button>}
            </div>
            <SearchResults/>
          </div>
        )}
        {tab==="favs"&&<FavsTab/>}
        {tab==="admin"&&<AdminTab/>}
      </div>

      <NavBar/>
      {editModal && (
        <div className="scrim" onClick={e=>{if(e.target===e.currentTarget)setEditModal(null);}}>
          <div className="sheet" onClick={e=>e.stopPropagation()}>
            <div className="sheet-handle"/>
            {editDone?(
              <div className="sheet-done">
                <div className="sheet-done-emoji">✅</div>
                <h3 className="sheet-done-title">수정 요청 완료!</h3>
                <p className="sheet-done-sub">관리자 검토 후 반영됩니다.</p>
                <button onClick={()=>setEditModal(null)} className="sheet-done-btn">닫기</button>
              </div>
            ):(
              <>
                <h3 className="sheet-title">재료 수정 제안</h3>
                <p className="sheet-sub">{editModal.recipe.title}</p>
                <div className="ref-box">
                  <p className="ref-label">현재 재료</p>
                  {editModal.original.map((ing,i)=><p key={i}>{ing.n}: {ing.a}</p>)}
                </div>
                <p className="sheet-label">수정 내용 <span style={{color:"var(--danger)"}}>*</span></p>
                <ImeInput multi value={editValue} onChange={setEditValue} maxLength={1000}
                  placeholder={"재료명: 양 형식으로 한 줄에 하나씩 작성\n(예시)\n된장: 2큰술\n두부: 1/2모"}
                  className="textarea" style={{height:120,marginBottom:12}}/>
                <p className="sheet-label">수정 이유 (선택)</p>
                <ImeInput value={editReason} onChange={setEditReason} maxLength={200}
                  placeholder="예: 분량이 너무 많아요, 재료가 빠졌어요" className="input" style={{marginBottom:editError?8:16}}/>
                {editError&&<p className="sheet-error">{editError}</p>}
                <div className="sheet-actions">
                  <button onClick={()=>setEditModal(null)} className="btn btn-secondary">취소</button>
                  <button onClick={submitEdit} disabled={!editValue.trim()||editSending} className="btn btn-primary">
                    {editSending?"전송 중...":"제안 보내기"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {reviewModal && (
        <div className="scrim" onClick={e=>{if(e.target===e.currentTarget)setReviewModal(null);}}>
          <div className="sheet" onClick={e=>e.stopPropagation()}>
            <div className="sheet-handle"/>
            <h3 className="sheet-title">레시피 후기 남기기</h3>
            <p className="sheet-sub">{allRecipes.find(r=>r.id===reviewModal)?.title}</p>
            <p className="sheet-label">맛 평점</p>
            <Stars v={draftStar} onChange={setDraftStar} size={32}/>
            <p className="sheet-label" style={{marginTop:16}}>메모 (선택)</p>
            <ImeInput multi value={draftNote} onChange={setDraftNote} placeholder="어떤 점이 좋았나요?" className="textarea" style={{height:80}}/>
            <div className="sheet-actions">
              <button onClick={()=>setReviewModal(null)} className="btn btn-secondary">취소</button>
              <button onClick={saveReview} disabled={!draftStar} className="btn btn-primary">저장하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
