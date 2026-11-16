// 推演引擎：校验 + DeepSeek 调用。浏览器与 Node 通用（仅依赖 fetch）。
import { WORLD_BIBLE, STAT_LABELS, openingPrompt, turnPrompt } from './prompts.mjs';

export const API_BASE = 'https://api.deepseek.com';

const clampInt = (v, lo, hi, d = 0) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d;
};

const clean = (v, max = 400) =>
  typeof v === 'string' ? v.replace(/[*#`]/g, '').replace(/\s+/g, ' ').trim().slice(0, max) : '';

const TAGS = ['怀柔', '铁血', '权谋', '奇诡', '守成'];

function normalizeOptions(list) {
  const arr = Array.isArray(list) ? list : [];
  const out = arr
    .map((o) => ({
      label: clean(o?.label, 12),
      desc: clean(o?.desc, 60),
      tag: TAGS.includes(o?.tag) ? o.tag : '守成',
    }))
    .filter((o) => o.label);
  if (out.length < 2) return null;
  return out.slice(0, 4);
}

export function normalizeScene(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const options = normalizeOptions(raw.options);
  const title = clean(raw.title, 20);
  const narration = clean(raw.narration, 600);
  if (!title || !narration || !options) return null;
  return { title, narration, omen: clean(raw.omen, 40), options };
}

export function normalizeTurn(raw, state) {
  if (!raw || typeof raw !== 'object') return null;
  const outcome = clean(raw.outcome, 900);
  if (!outcome) return null;

  const dsrc = raw.deltas && typeof raw.deltas === 'object' ? raw.deltas : {};
  const deltas = {};
  for (const k of STAT_LABELS) {
    deltas[k] = clampInt(dsrc[k], k === '国运' ? -25 : -15, k === '国运' ? 25 : 15, 0);
  }

  let figure = null;
  if (raw.figure && typeof raw.figure === 'object' && clean(raw.figure.name, 12)) {
    figure = {
      name: clean(raw.figure.name, 12),
      title: clean(raw.figure.title, 20),
      note: clean(raw.figure.note, 60),
    };
  }

  let ending = null;
  if (raw.ending && typeof raw.ending === 'object' && ['亡国', '盛世', '落幕'].includes(raw.ending.type)) {
    ending = { type: raw.ending.type, text: clean(raw.ending.text, 400) };
  }

  // 数值守卫：国运归零则强制结局
  const after = { ...state.stats };
  for (const k of STAT_LABELS) after[k] = Math.max(0, Math.min(100, after[k] + deltas[k]));
  if (after.国运 <= 0 && !ending) {
    ending = { type: '亡国', text: '国祚至此而终。史官搁笔，窗外正在下雪，无人再问来年。' };
  }

  const next = ending ? null : normalizeScene(raw.next);
  if (!ending && !next) return null;

  // 在位期满四十五年：无论模型是否给出，都必须落幕
  let finalEnding = ending;
  let finalNext = next;
  if (!finalEnding && state.year >= 45) {
    finalEnding = {
      type: '落幕',
      text: '永昌四十五年，帝春秋已高，诏告天下：朕在位四十有五年，赖社稷之灵，边境无事，百姓粗安。今以祖宗之重，传位于太子，退居西内。是年冬，天枢城无雪，市井鼓乐三日。史官记曰：一朝之终，不在城破之日，而在无人再议明日之时。此朝有议，故未终。',
    };
    finalNext = null;
  }

  return {
    outcome,
    deltas,
    chronicle: clean(raw.chronicle, 80) || `${state.eraName}${state.year}年，朝有大事。`,
    figure,
    next: finalNext,
    ending: finalEnding,
  };
}

function extractJSON(text) {
  const s = text.indexOf('{');
  const e = text.lastIndexOf('}');
  if (s < 0 || e <= s) throw new Error('模型未返回 JSON');
  return JSON.parse(text.slice(s, e + 1));
}

/** 调用 DeepSeek，返回模型输出的 JSON 对象（必要时自我修复一次） */
export async function callDeepSeek({ key, model = 'deepseek-chat', user, maxTokens = 1400, timeout = 80000, base = API_BASE, signal }) {
  if (!key) throw new Error('尚未配置 DeepSeek 密钥');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  if (signal) signal.addEventListener('abort', () => ctrl.abort(), { once: true });

  const messages = [
    { role: 'system', content: WORLD_BIBLE },
    { role: 'user', content: user },
  ];

  const once = async (msgs) => {
    const r = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: msgs,
        response_format: { type: 'json_object' },
        temperature: 1.05,
        max_tokens: maxTokens,
        stream: false,
      }),
      signal: ctrl.signal,
    });
    const text = await r.text();
    if (!r.ok) {
      let msg = `HTTP ${r.status}`;
      try {
        const j = JSON.parse(text);
        msg = j?.error?.message || msg;
        if (r.status === 401) msg = '密钥无效或已失效，请到设置里重新填入';
        if (r.status === 402) msg = '账户余额不足';
        if (r.status === 429) msg = '请求太频繁，稍等片刻';
      } catch {}
      throw new Error(msg);
    }
    let data;
    try { data = JSON.parse(text); } catch { throw new Error('上游返回异常'); }
    return data?.choices?.[0]?.message?.content || '';
  };

  try {
    const out = await once(messages);
    try {
      return extractJSON(out);
    } catch {
      const retry = await once([
        ...messages,
        { role: 'assistant', content: out.slice(0, 600) },
        { role: 'user', content: '上面的输出不是合法 JSON。只输出一个合法 JSON 对象，不要任何其他文字。' },
      ]);
      return extractJSON(retry);
    }
  } finally {
    clearTimeout(timer);
  }
}

/** 开局：生成第一幕 */
export async function requestOpening({ key, model, state, base }) {
  let scene = null;
  let lastErr = null;
  for (let i = 0; i < 2 && !scene; i++) {
    try {
      const raw = await callDeepSeek({ key, model, user: openingPrompt(state), maxTokens: 1400, base });
      scene = normalizeScene(raw);
    } catch (e) {
      lastErr = e;
      if (!/JSON/.test(e.message)) throw e;
    }
  }
  if (!scene) throw lastErr || new Error('史官落笔成谶，没能写出场面，请重试');
  return scene;
}

/** 回合：结算玩家选择，并生成下一幕 */
export async function requestTurn({ key, model, state, history, choice, base }) {
  let result = null;
  let lastErr = null;
  for (let i = 0; i < 2 && !result; i++) {
    try {
      const raw = await callDeepSeek({ key, model, user: turnPrompt(state, history, choice), maxTokens: 1300, base });
      result = normalizeTurn(raw, state);
    } catch (e) {
      lastErr = e;
      if (!/JSON/.test(e.message)) throw e;
    }
  }
  if (!result) throw lastErr || new Error('推演失序，请重试');

  // 封禅守卫：国运足够且选了封禅，必得盛世结局
  if (!result.ending && choice.kind === 'option' && /封禅/.test(choice.label || '') && state.stats.国运 >= 92) {
    result.ending = {
      type: '盛世',
      text: '永昌四十年，帝封禅于泰山。是日无风，云自脚下散开，百官跪了十里。史官记曰：大曜立国三百二十年，至此始有「盛世」二字。江湖亦传，那一夜有天人立于山巅，看了很久，终究没有下来。',
    };
    result.next = null;
  }
  return result;
}
