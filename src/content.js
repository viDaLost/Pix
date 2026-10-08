// Original encounters for the roads around Velen, 1740. Rewards arrive at home.
export const ROUTE_EVENTS = [
  {id:'forest-bridge',region:'forest',title:'Мостик после шторма',icon:'wood',text:'Обоз остановился у сломанного настила.',person:'rowan',choices:[
    {id:'repair',name:'Починить настил',route:'help',costs:{wood:2},loot:{iron:2},gold:18,xp:6},
    {id:'salvage',name:'Собрать сухие ветви',route:'gather',costs:{},loot:{wood:5,coal:1},gold:0,xp:2},
  ]},
  {id:'forest-post',region:'forest',title:'Почтовая карета',icon:'horseshoe',text:'У лошади слетела подкова. Почтарь просит помощи.',person:'nora',choices:[
    {id:'shoe',name:'Поправить подкову',route:'help',costs:{iron:1},loot:{copper:2},gold:16,xp:7},
    {id:'guide',name:'Провести карету к броду',route:'help',costs:{},loot:{wood:2},gold:10,xp:4},
  ]},
  {id:'mine-cart',region:'mine',title:'Тележка рудной артели',icon:'pickaxe',text:'У тележки треснуло крепление колеса.',person:'mira',choices:[
    {id:'brace',name:'Сделать крепление',route:'help',costs:{iron:1},loot:{iron:6,coal:2},gold:0,xp:7},
    {id:'carry',name:'Перенести часть груза',route:'gather',costs:{},loot:{iron:3,crystal:1},gold:0,xp:3},
  ]},
  {id:'mine-vein',region:'mine',title:'Жила под крепью',icon:'crystal',text:'В старом штреке блеснул кристалл.',person:'mira',choices:[
    {id:'support',name:'Укрепить штрек',route:'search',costs:{wood:2},loot:{crystal:3,iron:2},gold:0,xp:6},
    {id:'nearby',name:'Собрать руду у входа',route:'gather',costs:{},loot:{iron:4,coal:2},gold:0,xp:2},
  ]},
  {id:'ruins-record',region:'ruins',title:'Листы старого архива',icon:'orders',text:'Антиквар нашёл записи об инструментах прошлого века.',person:'daro',choices:[
    {id:'copy',name:'Переписать чертёж',route:'search',costs:{coal:1},loot:{copper:1},gold:0,xp:6,blueprint:true},
    {id:'pack',name:'Помочь упаковать книги',route:'help',costs:{},loot:{wood:2},gold:14,xp:4},
  ]},
  {id:'ruins-cabinet',region:'ruins',title:'Запертый кабинет',icon:'key',text:'За ржавым замком сохранились алхимические приборы.',person:'sera',choices:[
    {id:'open',name:'Разобрать замок',route:'search',costs:{iron:1},loot:{crystal:2},gold:0,xp:7,relic:true},
    {id:'catalogue',name:'Описать находки у входа',route:'help',costs:{},loot:{copper:3},gold:10,xp:4},
  ]},
  {id:'pass-storm',region:'pass',title:'Ночной снег',icon:'fire',text:'Проводница прячет груз от ветра.',person:'nora',choices:[
    {id:'shelter',name:'Обогреть укрытие',route:'help',costs:{coal:2},loot:{moon:2,crystal:1},gold:8,xp:7},
    {id:'trail',name:'Спуститься по старой тропе',route:'gather',costs:{},loot:{moon:1,coal:2},gold:0,xp:3},
  ]},
  {id:'pass-survey',region:'pass',title:'Отметка картографа',icon:'compass',text:'Элин ищет точку для новой морской карты.',person:'elin',choices:[
    {id:'signal',name:'Закрепить сигнальный знак',route:'help',costs:{wood:1,iron:1},loot:{moon:2},gold:18,xp:7},
    {id:'stones',name:'Собрать образцы породы',route:'search',costs:{},loot:{crystal:2,moon:1},gold:0,xp:4},
  ]},
];
export function routeEvent(id){return ROUTE_EVENTS.find(e=>e.id===id)||null;}

export const COMMISSION_TITLES={mira:'Инструмент рудной артели',bren:'Работа для портового караула',ada:'Товар для торгового обоза',elin:'Прибор картографа',rowan:'Заказ для усадьбы',sera:'Для аптекарской лаборатории',nora:'Снаряжение проводницы',daro:'Для кабинета редкостей'};
