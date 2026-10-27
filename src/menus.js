// Embedded inside the application closure. Menu data and navigation share S.
/* ============================ MENUS ============================ */
// CN X RJA530830-001V01, pp. 57-58, 68-69. Constants use CODATA 2010:
// https://physics.nist.gov/cuu/Constants/ArchiveASCII/allascii_2010.txt
var CONSTANT_CATEGORIES = [
  {
    "label": "Universal",
    "zh": "通用常数",
    "items": [
      {
        "id": "SCI:0:0",
        "label": "h",
        "val": 6.62606957e-34
      },
      {
        "id": "SCI:0:1",
        "label": "ℏ",
        "val": 1.054571726e-34
      },
      {
        "id": "SCI:0:2",
        "label": "c₀",
        "val": 299792458.0
      },
      {
        "id": "SCI:0:3",
        "label": "ε₀",
        "val": 8.854187817e-12
      },
      {
        "id": "SCI:0:4",
        "label": "μ₀",
        "val": 1.2566370614e-06
      },
      {
        "id": "SCI:0:5",
        "label": "Z₀",
        "val": 376.730313461
      },
      {
        "id": "SCI:0:6",
        "label": "G",
        "val": 6.67384e-11
      },
      {
        "id": "SCI:0:7",
        "label": "lₚ",
        "val": 1.616199e-35
      },
      {
        "id": "SCI:0:8",
        "label": "tₚ",
        "val": 5.39106e-44
      }
    ]
  },
  {
    "label": "Electromagnetic",
    "zh": "电磁常数",
    "items": [
      {
        "id": "SCI:1:0",
        "label": "μN",
        "val": 5.05078353e-27
      },
      {
        "id": "SCI:1:1",
        "label": "μB",
        "val": 9.27400968e-24
      },
      {
        "id": "SCI:1:2",
        "label": "e",
        "val": 1.602176565e-19
      },
      {
        "id": "SCI:1:3",
        "label": "Φ₀",
        "val": 2.067833758e-15
      },
      {
        "id": "SCI:1:4",
        "label": "G₀",
        "val": 7.7480917346e-05
      },
      {
        "id": "SCI:1:5",
        "label": "KJ",
        "val": 483597870000000.0
      },
      {
        "id": "SCI:1:6",
        "label": "RK",
        "val": 25812.8074434
      }
    ]
  },
  {
    "label": "Atomic & Nuclear",
    "zh": "原子与核常数",
    "items": [
      {
        "id": "SCI:2:0",
        "label": "mₚ",
        "val": 1.672621777e-27
      },
      {
        "id": "SCI:2:1",
        "label": "mₙ",
        "val": 1.674927351e-27
      },
      {
        "id": "SCI:2:2",
        "label": "mₑ",
        "val": 9.10938291e-31
      },
      {
        "id": "SCI:2:3",
        "label": "mμ",
        "val": 1.883531475e-28
      },
      {
        "id": "SCI:2:4",
        "label": "a₀",
        "val": 5.2917721092e-11
      },
      {
        "id": "SCI:2:5",
        "label": "α",
        "val": 0.0072973525698
      },
      {
        "id": "SCI:2:6",
        "label": "rₑ",
        "val": 2.8179403267e-15
      },
      {
        "id": "SCI:2:7",
        "label": "λc",
        "val": 2.4263102389e-12
      },
      {
        "id": "SCI:2:8",
        "label": "γₚ",
        "val": 267522200.5
      },
      {
        "id": "SCI:2:9",
        "label": "λcₚ",
        "val": 1.32140985623e-15
      },
      {
        "id": "SCI:2:10",
        "label": "λcₙ",
        "val": 1.3195909068e-15
      },
      {
        "id": "SCI:2:11",
        "label": "R∞",
        "val": 10973731.568539
      },
      {
        "id": "SCI:2:12",
        "label": "μₚ",
        "val": 1.410606743e-26
      },
      {
        "id": "SCI:2:13",
        "label": "μₑ",
        "val": -9.2847643e-24
      },
      {
        "id": "SCI:2:14",
        "label": "μₙ",
        "val": -9.6623647e-27
      },
      {
        "id": "SCI:2:15",
        "label": "μμ",
        "val": -4.49044807e-26
      },
      {
        "id": "SCI:2:16",
        "label": "mτ",
        "val": 3.16747e-27
      }
    ]
  },
  {
    "label": "Physico-Chem",
    "zh": "物理化学常数",
    "items": [
      {
        "id": "SCI:3:0",
        "label": "u",
        "val": 1.660538921e-27
      },
      {
        "id": "SCI:3:1",
        "label": "F",
        "val": 96485.3365
      },
      {
        "id": "SCI:3:2",
        "label": "NA",
        "val": 6.02214129e+23
      },
      {
        "id": "SCI:3:3",
        "label": "k",
        "val": 1.3806488e-23
      },
      {
        "id": "SCI:3:4",
        "label": "Vm",
        "val": 0.022413968
      },
      {
        "id": "SCI:3:5",
        "label": "R",
        "val": 8.3144621
      },
      {
        "id": "SCI:3:6",
        "label": "c₁",
        "val": 3.74177153e-16
      },
      {
        "id": "SCI:3:7",
        "label": "c₂",
        "val": 0.01438777
      },
      {
        "id": "SCI:3:8",
        "label": "σ",
        "val": 5.670373e-08
      }
    ]
  },
  {
    "label": "Adopted Values",
    "zh": "采用值",
    "items": [
      {
        "id": "SCI:4:0",
        "label": "g",
        "val": 9.80665
      },
      {
        "id": "SCI:4:1",
        "label": "atm",
        "val": 101325.0
      },
      {
        "id": "SCI:4:2",
        "label": "RK-90",
        "val": 25812.807
      },
      {
        "id": "SCI:4:3",
        "label": "KJ-90",
        "val": 483597900000000.0
      }
    ]
  },
  {
    "label": "Other",
    "zh": "其他",
    "items": [
      {
        "id": "SCI:5:0",
        "label": "t",
        "val": 273.15
      }
    ]
  }
];
var SCIENTIFIC_BY_ID={};
CONSTANT_CATEGORIES.forEach(function(group){group.items.forEach(function(item){SCIENTIFIC_BY_ID[item.id]=item;});});
// Unit categories/order follow the CN X reference sheet. Coefficients use SI
// definitions and NIST SP811 (2008); cal means calorie at 15 °C.
var CONVERSION_CATEGORIES=[];
function conversionGroup(label,zh,pairs){
  var items=[];
  pairs.forEach(function(pair){
    var from=pair[0],to=pair[1],factor=pair[2];
    items.push({id:from+"→"+to,label:from+"→"+to,factor:factor});
    items.push({id:to+"→"+from,label:to+"→"+from,factor:1/factor});
  });
  CONVERSION_CATEGORIES.push({label:label,zh:zh,items:items});
}
conversionGroup("Length","长度",[["in","cm",2.54],["ft","m",0.3048],["yd","m",0.9144],["mile","km",1.609344],["n mile","m",1852],["pc","km",3.085678e13]]);
conversionGroup("Area","面积",[["acre","m²",4046.8564224]]);
conversionGroup("Volume","体积",[["gal(US)","L",3.785411784],["gal(UK)","L",4.54609]]);
conversionGroup("Mass","质量",[["oz","g",28.349523125],["lb","kg",0.45359237]]);
conversionGroup("Velocity","速度",[["km/h","m/s",1/3.6]]);
conversionGroup("Pressure","压力",[["atm","Pa",101325],["mmHg","Pa",133.322387415],["kgf/cm²","Pa",98066.5],["lbf/in²","kPa",6.894757293168]]);
conversionGroup("Energy","能量",[["kgf·m","J",9.80665],["J","cal",1/4.1858]]);
conversionGroup("Power","功率",[["hp","kW",0.7456998715822702]]);
CONVERSION_CATEGORIES.push({label:"Temperature",zh:"温度",items:[
  {id:"°F→°C",label:"°F→°C",factor:5/9,offset:-32*5/9},
  {id:"°C→°F",label:"°C→°F",factor:9/5,offset:32}
]});
var CONVERSION_BY_ID={};
CONVERSION_CATEGORIES.forEach(function(group){group.items.forEach(function(item){CONVERSION_BY_ID[item.id]=item;});});
var SETUP_PER_PAGE=4;
var MENU_SHORTCUTS=["1","2","3","4","5","6","7","8","9","A","B","C","D","E","F","M","≈"];
function menuText(en,zh){return S.language==="zh"?(zh||en):en;}
function menuItem(id,en,zh,extra){
  var item={id:id,label:menuText(en,zh)};
  if(extra) Object.keys(extra).forEach(function(k){item[k]=extra[k];});
  return item;
}
function setMenu(type,title,items,extra){
  var m={type:type,title:title,items:items,index:0,cols:1,perPage:4};
  if(extra) Object.keys(extra).forEach(function(k){m[k]=extra[k];});
  S.menu=m;S.shift=false;S.alpha=false;render();return m;
}
function openMenu(type){
  if((type==="CONST"||type==="CONV")&&S.mode==="BASE") return;
  if(type==="MAIN"){
    var zh=["计算","复数","基数","矩阵","向量","统计","表格","方程/函数","不等式","比例"];
    setMenu(type,"",MODES.map(function(id,i){return menuItem(id,MODE_META[id].name,zh[i],{ico:MODE_META[id].ico});}),{cols:5,perPage:10});
  }else if(type==="SETUP"){
    setMenu(type,menuText("SETUP","设置"),settingsItems());
  }else if(type==="OPTN"){
    setMenu(type,menuText("OPTION","选项"),getOptions(S.mode));
  }else if(type==="CONST"||type==="CONV"){
    var groups=type==="CONST"?CONSTANT_CATEGORIES:CONVERSION_CATEGORIES;
    setMenu(type,menuText(type==="CONST"?"CONSTANTS":"CONVERSION",type==="CONST"?"科学常数":"单位换算"),groups.map(function(g,i){return menuItem(String(i),g.label,g.zh); }));
  }else if(type==="EQTYPE"){
    setMenu(type,menuText("Equation/Func","方程/函数"),[menuItem("sim","Simul Equation","联立方程"),menuItem("poly","Polynomial","多项式")]);
  }else if(type==="INEQ_DEGREE"){
    setMenu(type,menuText("Inequality degree","不等式次数"),[menuItem(2,"Degree 2","二次"),menuItem(3,"Degree 3","三次"),menuItem(4,"Degree 4","四次")]);
  }else if(type==="RATIO_TYPE"){
    setMenu(type,menuText("Ratio","比例"),[menuItem(2,"A:B = X:D"),menuItem(3,"A:B = C:X")]);
  }else if(type==="STAT_TYPE"){
    setMenu(type,menuText("Select Type","选择类型"),[
      menuItem("1var","1-Variable","单变量统计"),menuItem("2var","y=ax+b"),
      menuItem("quadratic","y=ax²+bx+c",null,{unavailable:true}),menuItem("log","y=a+b·ln(x)",null,{unavailable:true}),
      menuItem("exp","y=a·e^(bx)",null,{unavailable:true}),menuItem("abexp","y=a·b^x",null,{unavailable:true}),
      menuItem("power","y=a·x^b",null,{unavailable:true}),menuItem("inverse","y=a+b/x",null,{unavailable:true})]);
  }else if(type==="RESET"){
    setMenu(type,menuText("RESET","复位"),[
      menuItem("settings","Setup Data","设置数据"),menuItem("memory","Memory","存储器"),menuItem("all","Initialize All","全部初始化")]);
  }else if(type==="VAR"){
    var names=["A","B","C","D","E","F","X","Y","Z","M","Ans"];
    setMenu(type,menuText("VARIABLE","变量"),names.map(function(n){return menuItem(n,n+" = "+fmtRealPlain(n==="M"?S.M:n==="Ans"?S.ans:S.vars[n]));}));
  }
}
function getOptions(mode){
  function it(id,en,zh){return menuItem(id,en,zh);}
  switch(mode){
    case "CALC": return [it("calc_hyperbolic","Hyperbolic Func","双曲函数"),it("calc_angle","Angle Unit","角度单位"),it("calc_engineering","Engineer Symbol","工程符号")];
    // CN X pp.34–35 / EX p.18: four functions, then two output commands.
    case "CMPLX": return [it("arg","Argument","辐角"),it("conj","Conjugate","共轭"),it("re","Real Part","实部提取"),it("im","Imaginary Part","虚部提取"),it("complex_polar","▶r∠θ"),it("complex_rect","▶a+bi")];
    case "BASE": return [it("dec","DEC"),it("hex","HEX"),it("bin","BIN"),it("oct","OCT"),menuItem("and","AND",null,{unavailable:true}),menuItem("or","OR",null,{unavailable:true}),menuItem("xor","XOR",null,{unavailable:true}),menuItem("xnor","XNOR",null,{unavailable:true}),it("not","NOT")];
    case "MATRIX": return [it("define","Define Matrix","定义矩阵"),it("det","Determinant","行列式"),it("inv","Inverse","逆矩阵"),it("trn","Transpose","转置"),it("add","MatA+MatB"),it("sub","MatA−MatB"),it("mul","MatA×MatB")];
    case "VECTOR": return [it("define","Define Vector","定义向量"),it("dot","Dot","数量积"),it("cross","Cross","向量积"),it("vabs","Abs","模"),it("angle","Angle","夹角"),it("add","VctA+VctB")];
    case "STAT": return [it("calc","Calculate","计算"),it("clr","Clear Data","清除数据")];
    case "TABLE": return [it("exit","Exit Table","退出数表")];
    case "EQUATION": return [it("sim","Simultaneous","联立方程"),it("poly","Polynomial","多项式")];
    case "INEQ": return [it("deg2","Degree 2","二次"),it("deg3","Degree 3","三次"),it("deg4","Degree 4","四次"),it("gt",">"),it("lt","<"),it("ge","≥"),it("le","≤"),it("solve","Solve","求解")];
    case "RATIO": return [it("solve","Solve","求解")];
    default: return [];
  }
}
// Calculate-mode OPTN follows CN X pp.22/27. These are expression commands,
// independent of the global SETUP angle and engineering-display settings.
var ENGINEERING_EXPONENTS={m:-3,"μ":-6,n:-9,p:-12,f:-15,k:3,M:6,G:9,T:12,P:15,E:18};
function openCalculateOptionMenu(id,parent){
  var title=parent.items[parent.index].label,items,cols;
  if(id==="calc_hyperbolic"){
    items=[menuItem("sinh","sinh"),menuItem("cosh","cosh"),menuItem("tanh","tanh"),
      menuItem("asinh","sinh⁻¹"),menuItem("acosh","cosh⁻¹"),menuItem("atanh","tanh⁻¹")];cols=2;
  }else if(id==="calc_angle"){
    items=[menuItem("DEG","°"),menuItem("RAD","r"),menuItem("GRA","g")];cols=3;
  }else if(id==="calc_engineering"){
    items=["m","μ","n","p","f","k","M","G","T","P","E"].map(function(symbol){return menuItem(symbol,symbol);});cols=3;
  }else return;
  setMenu("CALC_OPTN_ITEMS",title,items,{parent:parent,category:id,symbols:true,cols:cols,perPage:items.length});
}
function prepareCalculateInsertion(){
  if(S.resultShown)return;
  var c=cur(),number=numTokenAtCursor();
  if(number){var index=c.arr.indexOf(number);splitNumberAt(c.arr,index,c.pos-tokenStart(c.arr,index));}
}
function insertCalculateSuffix(value){
  // A postfix command entered on a result operates on Ans; a draft command
  // stays at its current cursor, including inside a template argument.
  if(S.resultShown){clearInput();ins(T_var("Ans"));}
  clearAfterAnswer();ins(T_post(value));
}
function insertComplexFormat(format){
  if(S.resultShown){clearInput();ins(T_var("Ans"));}
  // Output commands apply to the complete expression, at its end, even when
  // the caret was inside a function or a number. Re-selection replaces a draft
  // command instead of producing two conflicting output commands.
  unwindCursor();
  if(complexOutputFormat(root))root.pop();
  stack[0].pos=arrDigits(root);
  clearAfterAnswer();ins(T_post("FORMAT:"+format));
}
function settingsItems(){
  return [
    menuItem("io","Input/Output","输入/输出"),menuItem("angle","Angle Unit","角度单位"),
    menuItem("fmt","Number Format","显示格式"),menuItem("engineering","Engineer Symbol","工程符号",{unavailable:true}),
    menuItem("frac","Fraction Result","分数结果"),menuItem("complex","Complex","复数"),
    menuItem("statistics","Statistics","统计",{unavailable:true}),menuItem("equation","Equation/Func","方程/函数"),
    menuItem("table","Table","表格"),menuItem("decimal","Decimal Mark","小数点显示",{unavailable:true}),
    menuItem("separator","Digit Separator","数字分隔符",{unavailable:true}),menuItem("font","MultiLine Font","多行字体",{unavailable:true}),
    menuItem("language","Language","语言"),menuItem("contrast","Contrast","对比度")
  ];
}
function menuPageStart(m){return Math.floor(m.index/m.perPage)*m.perPage;}
function closeMenu(){S.menu=null;S.alpha=false;S.shift=false;render();}
function menuUnavailable(){S.menu.notice=menuText("Not implemented","尚未实现");S.alpha=false;render();}
function handleMenuKey(id){
  var m=S.menu;if(!m) return;
  if(id==="ON"){closeMenu();return;}
  if(id==="MENU"){openMenu("MAIN");return;}
  if(id==="OPTN"){openMenu("OPTN");return;}
  if(id==="AC"){closeMenu();return;}
  if(m.type==="CONTRAST"){
    if(id==="LEFT"||id==="RIGHT"){S.contrast=Math.max(0.5,Math.min(1.5,S.contrast+(id==="LEFT"?-0.1:0.1)));render();return;}
    if(id==="EQUALS"||id==="OK"){closeMenu();return;}
    return;
  }
  if(id==="LEFT"&&m.parent){S.menu=m.parent;S.alpha=false;S.shift=false;render();return;}
  if(m.symbols&&S.shift&&id==="EQUALS"){
    S.shift=false;if(m.items.length>16){m.index=16;selectMenuItem();}return;
  }
  if(id==="EQUALS"||id==="OK"){selectMenuItem();return;}
  if(m.type==="DIGITS"){
    if(/^[0-9]$/.test(id)){applySetup(m.setting,Number(id));return;}
    return;
  }
  if(m.type==="MAIN"){
    if(id==="UP"||id==="DOWN"||id==="LEFT"||id==="RIGHT"){
      var delta=id==="UP"?-m.cols:id==="DOWN"?m.cols:id==="LEFT"?-1:1;
      m.index=Math.max(0,Math.min(m.items.length-1,m.index+delta));render();return;
    }
    if(/^[0-9]$/.test(id)){var n=id==="0"?9:Number(id)-1;if(n<m.items.length){m.index=n;selectMenuItem();}return;}
    return;
  }
  if(id==="UP"||id==="DOWN"){
    m.index=Math.max(0,Math.min(Math.floor((m.items.length-1)/m.perPage)*m.perPage,menuPageStart(m)+(id==="UP"?-m.perPage:m.perPage)));
    m.notice=null;S.alpha=false;render();return;
  }
  if(m.symbols&&id==="ALPHA"){S.alpha=!S.alpha;render();return;}
  var shortcut=id;
  if(m.symbols&&S.alpha){shortcut=varNameFromKey(id)||id;S.alpha=false;}
  else if(m.symbols&&id==="SHIFT"){S.shift=true;render();return;}
  else if(m.symbols&&S.shift&&id==="EQUALS"){shortcut="≈";S.shift=false;}
  var local=m.symbols?MENU_SHORTCUTS.indexOf(shortcut):(/^[1-4]$/.test(id)?Number(id)-1:-1);
  if(local>=0){var index=menuPageStart(m)+local;if(index<m.items.length&&local<m.perPage){m.index=index;selectMenuItem();}}
}
function menuCell(){
  var e;
  if(S.mode==="MATRIX"&&(e=S.matrix.edit)&&!e.dimStage)return {holder:S.matrix,value:e.data[e.r][e.c]};
  if(S.mode==="VECTOR"&&(e=S.vector.edit)&&!e.dimStage)return {holder:S.vector,value:e.data[e.c]};
  if(S.mode==="STAT"&&S.stat.type)return {holder:S.stat,value:S.stat.rows[S.stat.r][S.stat.c]};
  if((S.mode==="EQUATION"||S.mode==="INEQ")&&S.eq.coeff.length)return {holder:S.eq,value:S.eq.coeff[S.eq.sel]};
  if(S.mode==="RATIO"&&S.ratio.cells[S.ratio.sel]!==null)return {holder:S.ratio,value:S.ratio.cells[S.ratio.sel]};
  return null;
}
function menuCanEditExpression(){return S.mode==="CALC"||S.mode==="CMPLX"||S.mode==="TABLE";}
function selectMenuItem(){
  var m=S.menu,item=m&&m.items[m.index];if(!item) return;
  S.alpha=false;S.shift=false;
  if(item.unavailable){menuUnavailable();return;}
  if(m.type==="MAIN"){setMode(item.id);return;}
  if(m.type==="EQTYPE"){S.menu=null;doOptionAction(item.id);return;}
  if(m.type==="INEQ_DEGREE"){
    setMenu("INEQ_SIGN",menuText("Inequality type","不等式类型"),[menuItem(">","> 0"),menuItem("<","< 0"),menuItem("≥","≥ 0"),menuItem("≤","≤ 0")],{parent:m,degree:item.id});return;
  }
  if(m.type==="INEQ_SIGN"){
    S.eq.n=m.degree;S.eq.coeff=new Array(m.degree+1).fill(0);S.eq.sel=0;S.eq.buf=null;S.eq.result=null;
    S.eq.sign=item.id;closeMenu();return;
  }
  if(m.type==="RATIO_TYPE"){
    S.ratio={cells:item.id===2?["","",null,""]:["","","",null],sel:0,buf:null,result:null,unknown:item.id};closeMenu();return;
  }
  if(m.type==="STAT_TYPE"){
    S.stat.type=item.id;S.stat.rows=item.id==="1var"?[[""],[""],[""],[""]]:[["",""],["",""],["",""],["",""]];
    S.stat.r=0;S.stat.c=0;S.stat.buf=null;S.stat.results=null;closeMenu();return;
  }
  if(m.type==="OPTN"&&S.mode==="CALC"){openCalculateOptionMenu(item.id,m);return;}
  if(m.type==="CALC_OPTN_ITEMS"){
    S.menu=null;prepareCalculateInsertion();
    if(m.category==="calc_hyperbolic")inputFunc(item.id);
    else insertCalculateSuffix((m.category==="calc_angle"?"ANGLE:":"ENG:")+item.id);
    render();return;
  }
  if(m.type==="OPTN"){S.menu=null;doOptionAction(item.id);return;}
  if(m.type==="SETUP"){doSetup(item.id);return;}
  if(m.type==="CHOICE"){applySetup(m.setting,item.id);return;}
  if(m.type==="CONST"||m.type==="CONV"){
    var group=(m.type==="CONST"?CONSTANT_CATEGORIES:CONVERSION_CATEGORIES)[Number(item.id)];
    setMenu(m.type+"_ITEMS",menuText(group.label,group.zh),group.items,{parent:m,symbols:true,cols:3,perPage:18});return;
  }
  if(m.type==="CONST_ITEMS"){
    var cell=menuCell();
    if(cell){cell.holder.buf=String(item.val);closeMenu();return;}
    if(!menuCanEditExpression()){menuUnavailable();return;}
    S.menu=null;startFreshIfResult();ins(T_const(item.id));render();return;
  }
  if(m.type==="CONV_ITEMS"){
    var conversionCell=menuCell();
    if(conversionCell){
      var source=conversionCell.holder.buf;
      if(source===null||source===undefined)source=conversionCell.value;
      if(source===null||source===undefined||source===""||!isFinite(Number(source))){S.menu=null;S.error="Syntax ERROR";render();return;}
      conversionCell.holder.buf=String(Number(source)*item.factor+(item.offset||0));closeMenu();return;
    }
    if(!menuCanEditExpression()){menuUnavailable();return;}
    S.menu=null;
    if(S.resultShown){clearInput();ins(T_var("Ans"));}
    else if(root.length===0&&S.hasAns)ins(T_var("Ans"));
    clearAfterAnswer();ins(T_post("CONV:"+item.id));render();return;
  }
  if(m.type==="VAR"){S.menu=null;startFreshIfResult();ins(T_var(item.id));render();return;}
  if(m.type==="RESET"){
    setMenu("RESET_CONFIRM",menuText("Reset "+item.label+"?","复位："+item.label+"？"),[
      menuItem("yes","Yes (=)","是 (=)"),menuItem("no","No","否")],{parent:m,reset:item.id});return;
  }
  if(m.type==="RESET_CONFIRM"){
    if(item.id==="yes"){
      if(m.reset==="settings"||m.reset==="all")resetSettings();
      if(m.reset==="memory"||m.reset==="all")resetMemory();
      clearInput();S.resultHTML="";
      if(m.reset==="all"){
        S.matrix={A:null,B:null,C:null,D:null,sel:"A",edit:null};
        S.vector={A:null,B:null,C:null,D:null,sel:"A",edit:null};
        S.stat={type:null,rows:[["",""],["",""],["",""],["",""]],r:0,c:0,buf:null,results:null};
        S.calcPending=null;S.stoPending=false;S.message=null;setMode("CALC");return;
      }
    }
    closeMenu();return;
  }
}
function setupChoices(setting,items){
  setMenu("CHOICE",S.menu.items[S.menu.index].label,items,{parent:S.menu,setting:setting});
}
function doSetup(id){
  var choices;
  if(id==="io") choices=[menuItem("math","MathI/MathO","数学输入/数学输出"),menuItem("decimal","MathI/DecimalO","数学输入/小数输出"),menuItem("line","LineI/LineO","线性输入/线性输出",{unavailable:true}),menuItem("linedecimal","LineI/DecimalO","线性输入/小数输出",{unavailable:true})];
  if(id==="angle") choices=[menuItem("DEG","Degree (D)","度 (D)"),menuItem("RAD","Radian (R)","弧度 (R)"),menuItem("GRA","Gradian (G)","百分度 (G)")];
  if(id==="fmt") choices=[menuItem("FIX","Fix","位数 (Fix)"),menuItem("SCI","Sci","科学 (Sci)"),menuItem("NORM","Norm","常规 (Norm)")];
  if(id==="frac") choices=[menuItem("mixed","ab/c","带分数"),menuItem("improper","d/c","假分数")];
  if(id==="complex") choices=[menuItem("rect","a+bi"),menuItem("polar","r∠θ")];
  if(id==="equation") choices=[menuItem(true,"On","开"),menuItem(false,"Off","关")];
  if(id==="table") choices=[menuItem(1,"f(x)"),menuItem(2,"f(x),g(x)")];
  if(id==="language") choices=[menuItem("en","English"),menuItem("zh","中文")];
  if(id==="contrast"){setMenu("CONTRAST",menuText("Contrast  ◀ ▶","对比度  ◀ ▶"),[],{parent:S.menu});return;}
  if(choices) setupChoices(id,choices);
}
function applySetup(id,value){
  var m=S.menu;
  if(id==="fmt"){
    if(value==="NORM"){
      setMenu("CHOICE","Norm",[menuItem(1,"Norm 1"),menuItem(2,"Norm 2")],{parent:m,setting:"norm"});return;
    }
    setMenu("DIGITS",value+menuText(" digits (0–9)"," 位数 (0–9)"),[],{parent:m,setting:value});return;
  }
  if(id==="FIX"||id==="SCI")S.fmt={mode:id,digits:id==="SCI"&&value===0?10:value,norm:S.fmt.norm};
  else if(id==="norm")S.fmt={mode:"NORM",digits:2,norm:value};
  else if(id==="io"){S.io="MATH";S.decimalOutput=value==="decimal";S.exact=!S.decimalOutput;}
  else if(id==="angle")S.angle=value;
  else if(id==="frac")S.fracForm=value;
  else if(id==="complex")S.complexFormat=value;
  else if(id==="equation")S.equationComplex=value;
  else if(id==="table")S.tableFunctions=value;
  else if(id==="language")S.language=value;
  if(S.resultShown&&S.hasAns){try{S.resultHTML=formatResult(S.ans);}catch(e){S.error=e.msg||"Math ERROR";}}
  closeMenu();
}
function resetSettings(){
  S.angle="DEG";S.io="MATH";S.decimalOutput=false;S.fmt={mode:"NORM",digits:2,norm:1};
  S.fracResult=true;S.fracForm="improper";S.exact=true;S.eng=false;
  S.complexFormat="rect";S.equationComplex=true;S.tableFunctions=2;
}
function resetMemory(){for(var k in S.vars)S.vars[k]=0;S.M=0;S.ans=0;S.hasAns=false;S.history=[];}
