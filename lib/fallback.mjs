// 推演司·简版：无 API Key 时的本地规则引擎，保证游戏可玩。
// 文风刻意写得克制，与 AI 版区别在于「不出错但也不惊艳」。

const OPENINGS = [
  {
    id: 'north',
    title: '雪落北门',
    omen: '紫微移位，武曲无光。',
    narration:
      '永昌二十七年春，北境雪线压到长城脚下。铁勒的探马在关外三十里处扎营，一日三换。镇北将军的密折只写了四个字：粮、马、人心。而天枢城的春闱刚放榜，三百新科进士挤在朱雀门外，等的是一纸任命，也是一年在京的米价。',
    options: [
      { label: '增兵北境', desc: '调京营三卫北上，粮从何出？', tag: '铁血', deltas: { 国运: 2, 国库: -12, 军力: 8, 民心: -4 }, outcome: '三卫连夜开拔，京营空了大半。北境士气一振，铁勒的探马后撤十里。只是户部的账房当晚就点了三遍灯——今岁的漕粮，只够支撑到入秋。', chronicle: '永昌二十七年，调京营三卫北戍，铁勒退十里。' },
      { label: '遣使和亲', desc: '以宗女许铁勒可汗之孙。', tag: '怀柔', deltas: { 国运: -2, 民心: -6, 威望: -5, 国库: 6 }, outcome: '使团出雁门那日，礼部的鼓乐被风吹散。铁勒收了嫁妆，却把使团留在营中"观礼"——这是要议价的意思。朝中已有御史写好了弹章，只等一个时机。', chronicle: '永昌二十七年，遣宗女和亲铁勒，使团滞留。' },
      { label: '问计江湖', desc: '召东海剑冢入京，以剑制骑。', tag: '奇诡', deltas: { 国运: 1, 武运: 9, 威望: -3, 民心: 2 }, outcome: '一封没有落款的请帖送去东海。七日后，一个背剑的老者在城门口吃了三碗面，留下一句话：剑冢不问朝堂，但可以问一个人。那人如今在枯荣寺扫地。', chronicle: '永昌二十七年，请剑冢入京，剑客指路枯荣寺。' },
    ],
  },
  {
    id: 'salt',
    title: '盐铁旧账',
    omen: '库房有鼠，仓中有蠹。',
    narration:
      '户部尚书在早朝上跪了半个时辰，说盐铁税三年未足额，差额足够修两条漕渠。崔氏的宗祠里，同一天进了六位穿紫袍的人。天枢城的茶楼开始传一句话：天子要动世家了。这话传得快，说明有人想让它传得快。',
    options: [
      { label: '彻查到底', desc: '派御史查盐引，不问姓氏。', tag: '铁血', deltas: { 国运: 3, 国库: 14, 民心: 6, 威望: -6 }, outcome: '御史台三日封了七处盐仓，账册却少了一箱。崔氏老太爷当夜进宫，长跪不起，只求留一条活路。查下去能追回银子，但朝堂上有一半的椅子会空出来。', chronicle: '永昌二十七年，查盐铁旧账，崔氏请罪。' },
      { label: '各退一步', desc: '免崔氏三年旧税，换开海。', tag: '权谋', deltas: { 国运: 1, 国库: 6, 民心: -4, 威望: 2 }, outcome: '崔氏接了这份体面，第二个月就献上三条海船的图纸。只是市井中多了个说法：天子的刀，砍不动世家的门。这话比盐税更难收。', chronicle: '永昌二十七年，免崔氏旧税，换开海之议。' },
      { label: '另开盐路', desc: '绕开三世家，自设盐场。', tag: '奇诡', deltas: { 国库: -8, 民心: 8, 武运: 2, 国运: 0 }, outcome: '东南三十里滩涂被圈成新盐场，第一批盐出来时是苦的。灶户连夜改法，第二批才勉强能用。世家没说话，只是新盐入城那天，城门口多了三十个卖私盐的。', chronicle: '永昌二十七年，东南新盐场开，私盐渐起。' },
    ],
  },
  {
    id: 'swordsman',
    title: '白衣入京',
    omen: '剑气冲斗，客星犯帝座。',
    narration:
      '一个白衣人昨日进了天枢城，没有通关文牒。守门校尉说，那人的剑是裹在布里背进来的，布上有海腥味。今日辰时，白衣人坐在皇城外的石阶上，说想见一见天子。禁军三百人围了他一炷香，没敢动手。',
    options: [
      { label: '开门相见', desc: '以国士之礼待之，试其心。', tag: '怀柔', deltas: { 武运: 8, 威望: 3, 国运: 1, 国库: -4 }, outcome: '白衣人进了书房，只说了三句话，其中一句是：北边那位铁勒可汗帐下，有一位藏了二十年的宗师。说完便走，不留姓名。禁军统领事后说，那人走过他身边时，他的刀自己响了。', chronicle: '永昌二十七年，白衣剑客入京，言铁勒有宗师。' },
      { label: '礼送出境', desc: '不敢用，也不敢杀。', tag: '守成', deltas: { 武运: -5, 威望: -4, 民心: -3 }, outcome: '白衣人没有回头，只把裹剑的布留在了城门口。布上绣着半个字，看不真切。三日后，江湖上传开：大曜连一个白衣人都留不住。这话传得比剑快。', chronicle: '永昌二十七年，送白衣客出京，江湖有讥。' },
      { label: '围杀立威', desc: '三百禁军，一个不留。', tag: '铁血', deltas: { 国运: -8, 武运: -12, 威望: 5, 民心: -2 }, outcome: '三百人围到日落，白衣人踏着城墙走了。禁军折了十七人，都是好手。第二天，城墙上多了一行剑痕组成的字：此城无剑。朝堂震动，江湖却安静得出奇——安静得不像好事。', chronicle: '永昌二十七年，围杀白衣客不成，城头刻字。' },
    ],
  },
  {
    id: 'temple',
    title: '活佛东来',
    omen: '梵音过境，西方有兵。',
    narration:
      '枯荣寺的活佛要来了。仪仗三千，僧兵八百，走的是一条从未走过的官道——那条路经过三座粮仓。西陲三州的刺史联名上表，说百姓已经跪在路边等了半个月。钦天监的老监正说了一句不该说的话：活佛脚下没有国土，只有信众。',
    options: [
      { label: '拒之关外', desc: '边关闭门，不许一僧东来。', tag: '铁血', deltas: { 威望: 6, 民心: -10, 军力: 3, 国运: -3 }, outcome: '雁门闭了七日，活佛在关外打坐七日。第八日清晨，关墙上出现了三千盏酥油灯，不知是谁点上去的。守将请罪时浑身发抖，说他手下的兵，有一半跪了。', chronicle: '永昌二十七年，拒活佛于雁门，边军有信众。' },
      { label: '以礼相待', desc: '开中门相迎，观其虚实。', tag: '怀柔', deltas: { 民心: 8, 威望: -5, 国库: -6, 武运: -2 }, outcome: '活佛入城那日，朱雀大街空了一半——百姓都去看梵驾了。他在宫中只谈佛，不谈土。临走时看了皇帝一眼，说：陛下身上，有很重的刀气。满殿寂然。', chronicle: '永昌二十七年，迎活佛入京，帝与之对坐。' },
      { label: '辩经拆台', desc: '召天下高僧，当庭辩经。', tag: '权谋', deltas: { 威望: 4, 民心: 2, 国库: -3, 国运: 1 }, outcome: '辩了三日，枯荣寺输了一阵，活佛却笑了，说输得好。他留下三个弟子在天枢城译经，一住就是三年。三年后人们才发现，那三人译的都是同一种经——讲国王如何护法的经。', chronicle: '永昌二十七年，辩经胜枯荣寺，留三僧译经。' },
    ],
  },
  {
    id: 'wulin',
    title: '武运将尽',
    omen: '星陨如雨，武士无名。',
    narration:
      '钦天监的旧档里，武运已连着十一年下滑。江湖上最后一位宗师在去年病故，他的七个弟子分了他的剑，各自去了七个方向。京营校场上，新募的兵卒射不满五十步。有人上疏，说该重开武举；也有人说，武运是天给的，求不来。',
    options: [
      { label: '重开武举', desc: '寒门亦可入仕，以武换阶。', tag: '奇诡', deltas: { 武运: 10, 民心: 7, 国库: -9, 威望: -2 }, outcome: '武举放榜那日，朱雀门外挤了四千人，其中一半是世家子弟。头名是个卖炭出身的独臂汉子，箭射穿了百步外的铜钱。崔氏当夜递了帖子，请他去做西席——晚了一步。', chronicle: '永昌二十七年，重开武举，寒门夺魁。' },
      { label: '推演天象', desc: '设坛祈运，劳民伤财。', tag: '守成', deltas: { 国库: -12, 民心: -6, 武运: 4, 国运: -1 }, outcome: '祭坛筑了九丈，烧了三万斤香。第七日夜里真有一颗星动了，监正跪地说武运将复。第二个月，江南大水，淹了四个州。百姓说，那颗星是拿他们的田换的。', chronicle: '永昌二十七年，设坛祈武运，江南大水。' },
      { label: '放任自流', desc: '不设武举，不祈天，任江湖自生。', tag: '守成', deltas: { 武运: -4, 国库: 5, 民心: 0, 威望: -3 }, outcome: '朝廷什么也没做。半年后，江湖上反倒多了一个消息：有人在北境见过一个用刀的少年，一刀劈开了铁勒的狼旗。消息真假不知，但天枢城的茶馆讲了三个月。', chronicle: '永昌二十七年，不设武举，北境传少年刀客。' },
    ],
  },
  {
    id: 'heir',
    title: '东宫空悬',
    omen: '双日并出，储位不明。',
    narration:
      '立储的奏折已经压了三年。晋王在宗正寺加了两个属官，楚王在南境修了一座不合制的王府。太傅昨日进宫，跪在阶下不肯起，说：陛下春秋已高，社稷无主，人心必摇。皇帝看着殿外的雪，想起自己登基那年，也是这样的雪。',
    options: [
      { label: '立嫡立长', desc: '循祖制，堵天下悠悠之口。', tag: '守成', deltas: { 威望: 5, 民心: 3, 国运: 2, 军力: -3 }, outcome: '册文颁下那日，晋王称病不出，楚王上了贺表，表文写得极工整。工整得像提前三月就写好的。东宫的门槛换新了，只是新得太快，木料还没干透。', chronicle: '永昌二十七年，立嫡长子为太子。' },
      { label: '择贤而立', desc: '考较诸王，不循旧例。', tag: '权谋', deltas: { 国运: 3, 威望: -3, 民心: 5, 武运: 1 }, outcome: '三道策问发下去，晋王答得最漂亮，楚王交的是白卷。放榜前一夜，楚王府的灯亮到天明。第二日，楚王自请削去三护卫，只留二百人守陵。这一手，比任何策问都漂亮。', chronicle: '永昌二十七年，策问诸王，楚王自请削卫。' },
      { label: '留中不发', desc: '再拖一年，看谁先动。', tag: '奇诡', deltas: { 国运: -2, 威望: -6, 民心: -4, 武运: 2 }, outcome: '奏折继续压在案头。三个月后，京中出现一本无名小册子，讲的是一位无嗣老僧与两个徒弟的故事。查了半月，查不出印坊。钦天监说，这是有人拿故事当刀使。', chronicle: '永昌二十七年，储位仍悬，京中流言四起。' },
    ],
  },
];

const TWISTS = {
  铁血: [
    '只是那句「按律处置」传到军中，被念成了「按例处置」——一字之差，多杀了十七个人。',
    '军报传回时夹了一封私信，写信的人已经不在了。',
    '此事办得干净，干净到有人开始害怕下一个被办的是自己。',
  ],
  怀柔: [
    '受恩的一方没有谢恩，只是安静了三个月——安静得让人不安。',
    '回礼在半月后送到，是一箱旧书，书页间夹着一片北地的枯叶。',
    '京中随即有了歌谣，歌里唱的不是皇恩，是某个人的名字。',
  ],
  权谋: [
    '局布得极巧，巧到有人在局外又布了一层。',
    '这一步走完，棋盘上多了一个人，没人知道他是谁放进来的。',
    '御史台的密匣里多了一份卷宗，封皮上没有名字。',
  ],
  奇诡: [
    '事情成了，成得莫名其妙，像是有人替朝廷把路先走了一遍。',
    '此后每逢阴雨，钦天监的铜壶滴漏都会慢上三刻。',
    '那道旨意被人抄了七份，散在七座州城的茶楼里。',
  ],
  守成: [
    '什么也没发生，只是民间开始把这一年叫做「无事之年」，语气不像称颂。',
    '旧例按部就班地走完，只是走在最后的那个人，换了一张脸。',
    '安稳是对的，只是安稳久了，边关的马会忘记奔跑。',
  ],
};

const ENDING_WAN = [
  '永昌二十七年冬，天枢城破。史官在最后一页写：帝在位二十七年，勤于政事，然天命不与。下笔时手在抖，墨点落在「不与」二字上，晕开像一朵花。',
  '国祚三百二十年，终于此。城破那日没有哭声，宫人各自散去，有人在太极殿的柱子上刻了一行小字：愿来世不生于帝王家。',
];

function pick(state, used) {
  // 依最低数值挑事件，避免重复
  const order = [
    ['国库', 'salt'],
    ['民心', 'heir'],
    ['武运', 'wulin'],
    ['军力', 'north'],
    ['威望', 'temple'],
  ];
  const sorted = order.slice().sort((a, b) => state.stats[a[0]] - state.stats[b[0]]);
  for (const [, id] of sorted) {
    const scene = OPENINGS.find((s) => s.id === id);
    if (scene && !used.includes(id)) return scene;
  }
  const pool = OPENINGS.filter((s) => !used.includes(s.id));
  return (pool.length ? pool : OPENINGS)[0];
}

const clamp = (v) => Math.max(0, Math.min(100, v));
const jitter = (n) => n + Math.round((Math.random() - 0.5) * 2);

const CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const cnYear = (n) => {
  if (n <= 1) return '元';
  if (n < 10) return CN[n];
  if (n < 20) return '十' + (n % 10 ? CN[n % 10] : '');
  return CN[Math.floor(n / 10)] + '十' + (n % 10 ? CN[n % 10] : '');
};

export function localStart(state) {
  const scene = pick(state, []);
  return { id: scene.id, title: scene.title, narration: scene.narration, omen: scene.omen, options: scene.options.map(({ label, desc, tag }) => ({ label, desc, tag })) };
}

export function localResolve(state, choice, usedIds) {
  const scene = OPENINGS.find((s) => s.id === (choice.sceneId || '')) || OPENINGS[0];
  let opt = scene.options.find((o) => o.label === choice.label);
  const custom = !opt;
  if (!opt) {
    // 自拟旨意：给一个中庸偏向的结果
    opt = {
      tag: '守成',
      deltas: { 国运: Math.round((Math.random() - 0.55) * 6), 民心: jitter(0), 国库: jitter(-4), 军力: jitter(0), 武运: jitter(-1), 威望: jitter(1) },
      outcome: `旨意传到中书省，几位相爷对着那行字看了半日，最后是礼部先动了。事情办得不算好，也不算坏，只是办完之后，朝中多了一条不成文的规矩：往后凡有非常之旨，先问一句「陛下可是认真的」。`,
      chronicle: `永昌${cnYear(state.year)}年，帝有非常之旨，朝野侧目。`,
    };
  }
  const deltas = {};
  for (const k of Object.keys(opt.deltas)) deltas[k] = jitter(opt.deltas[k]);
  const twist = TWISTS[opt.tag][Math.floor(Math.random() * TWISTS[opt.tag].length)];

  const nextStats = { ...state.stats };
  for (const k of Object.keys(deltas)) nextStats[k] = clamp(state.stats[k] + deltas[k]);

  let ending = null;
  if (nextStats.国运 <= 0) {
    ending = { type: '亡国', text: ENDING_WAN[Math.floor(Math.random() * ENDING_WAN.length)] };
  } else if (state.year >= 45) {
    ending = {
      type: '落幕',
      text: '永昌四十五年，帝春秋已高，诏告天下：朕在位四十有五年，边境无事，百姓粗安。今传位于太子，退居西内。是年冬，天枢城无雪，市井鼓乐三日。史官记曰：一朝之终，不在城破之日，而在无人再议明日之时。此朝有议，故未终。',
    };
  }

  const used = [...usedIds, scene.id];
  const nextScene = ending ? null : pick({ stats: nextStats }, used.slice(-4));
  const yearStr = `永昌${cnYear(state.year)}年`;

  return {
    outcome: opt.outcome + twist,
    deltas,
    chronicle: opt.chronicle.replace(/^永昌[一二三四五六七八九十]+年/, yearStr),
    figure: null,
    local: true,
    sceneId: nextScene ? nextScene.id : null,
    next: nextScene
      ? {
          title: nextScene.title,
          narration: nextScene.narration,
          omen: nextScene.omen,
          options: nextScene.options.map(({ label, desc, tag }) => ({ label, desc, tag })),
        }
      : null,
    ending,
  };
}
