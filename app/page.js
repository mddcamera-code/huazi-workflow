"use client";

import { useMemo, useState } from "react";

const API_URL = "https://tdyun.ai/v1/chat/completions";
const API_KEY = "sk-V9ThR40QayZE8ZdXUVmTyZxqLYo5dGdf05vlH2RJHOViAT5S";
const MODEL = "deepseek-3.2";

const HARD = ["陪酒", "商K", "小姐", "陪睡", "出台", "外围"];
const SOFT = ["来钱快", "尺度", "配合度高", "灌酒"];
const REPLACE = {
  陪酒: "服务",
  商K: "商务俱乐部",
  小姐: "工作人员",
  陪睡: "兼职",
  出台: "私活",
  外围: "外部渠道",
  来钱快: "收入好",
  尺度: "要求",
  配合度高: "配合性强",
  灌酒: "劝酒",
};

const VIBES = ["骂醒型", "拆穿型", "科普型", "体贴新人型"];

const EMPTY_SCRIPT = {
  hook: "",
  conflict: "",
  memory: "",
  conclusion: "",
};

function cleanJsonResponse(raw) {
  return raw.replace(/```json|```/g, "").trim();
}

async function callAI(systemPrompt, userMsg) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMsg },
      ],
    }),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(
      typeof data.error === "string" ? data.error : JSON.stringify(data.error),
    );
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`空响应：${JSON.stringify(data)}`);
  }

  return content;
}

export default function HomePage() {
  const [step, setStep] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [selectedVibe, setSelectedVibe] = useState("骂醒型");
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState("");
  const [topics, setTopics] = useState([]);
  const [selectedTopicIndex, setSelectedTopicIndex] = useState(null);

  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptError, setScriptError] = useState("");
  const [script, setScript] = useState(EMPTY_SCRIPT);
  const [copyLabel, setCopyLabel] = useState("复制全文");

  const [violations, setViolations] = useState([]);

  const selectedTopic =
    selectedTopicIndex === null ? null : topics[selectedTopicIndex];

  const wordCount = useMemo(() => {
    return Object.values(script).reduce((sum, part) => sum + part.length, 0);
  }, [script]);

  const countOk = wordCount >= 330 && wordCount <= 350;

  async function generateTopics() {
    if (!keyword.trim()) {
      return;
    }

    setTopicsLoading(true);
    setTopicsError("");
    setTopics([]);
    setSelectedTopicIndex(null);

    const sys =
      "你是华仔，夜场人事十年，抖音账号定位是拆穿领队套路、保护夜场新人直接找公司。说话大白话、情绪有力、善用反问句。禁止出现：陪酒、商K、小姐、陪睡、出台、外围。只输出JSON，不输出任何其他内容。";
    const usr = `基于关键词【${keyword.trim()}】和气质【${selectedVibe}】，生成5个抖音选题角度。

只返回如下JSON数组，不要解释不要markdown不要代码块：
[{"title":"可直接用作视频标题","hook":"第一句话怎么勾人","comment":"这条发出去评论区会吵什么","vibe":"${selectedVibe}"}]`;

    try {
      const raw = await callAI(sys, usr);
      const parsed = JSON.parse(cleanJsonResponse(raw));
      setTopics(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      setTopicsError(error.message || "生成失败");
    } finally {
      setTopicsLoading(false);
    }
  }

  async function generateScript() {
    if (!selectedTopic) {
      return;
    }

    setStep(2);
    setScriptLoading(true);
    setScriptError("");
    setViolations([]);

    const sys =
      "你是华仔，夜场人事十年，抖音账号定位是拆穿领队套路、保护夜场新人直接找公司。说话大白话、情绪有力、善用反问句。禁止出现：陪酒、商K、小姐、陪睡、出台、外围。只输出JSON对象，不输出任何其他内容。";
    const usr = `基于选题【${selectedTopic.title}】，气质【${selectedTopic.vibe}】，钩子参考【${selectedTopic.hook}】，生成一篇口播脚本。

结构固定四段：
- 钩子：前3秒留人，反问或反常识，30-40字
- 冲突：揭矛盾戳痛点，120-140字
- 记忆点：一句能被截图传播的话，30-40字
- 结论：身份锚点+评论区互动召唤，60-80字

总字数330-350字，对应75秒口播。结尾必须含"我是华仔，做夜场人事十年"和评论区互动引导。

只返回如下JSON对象，不要解释不要markdown不要代码块：
{"hook":"钩子内容","conflict":"冲突内容","memory":"记忆点内容","conclusion":"结论内容"}`;

    try {
      const raw = await callAI(sys, usr);
      const parsed = JSON.parse(cleanJsonResponse(raw));
      setScript({
        hook: parsed.hook || "",
        conflict: parsed.conflict || "",
        memory: parsed.memory || "",
        conclusion: parsed.conclusion || "",
      });
    } catch (error) {
      setScriptError(error.message || "生成失败");
      setScript({
        ...EMPTY_SCRIPT,
        hook: `生成失败：${error.message || "未知错误"}`,
      });
    } finally {
      setScriptLoading(false);
    }
  }

  function updateScriptPart(key, value) {
    setScript((prev) => ({ ...prev, [key]: value }));
  }

  async function copyScript() {
    const full = [
      script.hook,
      script.conflict,
      script.memory,
      script.conclusion,
    ].join("\n\n");

    try {
      await navigator.clipboard.writeText(full);
      setCopyLabel("已复制");
      window.setTimeout(() => setCopyLabel("复制全文"), 1500);
    } catch {
      setCopyLabel("复制失败");
      window.setTimeout(() => setCopyLabel("复制全文"), 1500);
    }
  }

  function runCheck() {
    const full = [
      script.hook,
      script.conflict,
      script.memory,
      script.conclusion,
    ].join(" ");

    const found = [];
    HARD.forEach((word) => {
      if (full.includes(word)) {
        found.push({ word, type: "hard", suggest: REPLACE[word] || "—" });
      }
    });
    SOFT.forEach((word) => {
      if (full.includes(word)) {
        found.push({ word, type: "soft", suggest: REPLACE[word] || "—" });
      }
    });

    setViolations(found);
    setStep(3);
  }

  return (
    <main className="app">
      <h1>华仔 · 口播工作流</h1>

      <div className="step-bar" aria-label="工作流步骤">
        {[1, 2, 3].map((index) => (
          <div className="step-wrap" key={index}>
            <div
              className={[
                "step",
                step === index ? "active" : "",
                step > index ? "done" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="step-dot">{index}</div>
              {index === 1 ? "选题规划" : index === 2 ? "脚本生成" : "违禁词检测"}
            </div>
            {index < 3 ? <div className="sep" /> : null}
          </div>
        ))}
      </div>

      {step === 1 ? (
        <section>
          <div className="card">
            <div className="field">
              <label className="label" htmlFor="keyword">
                方向关键词
              </label>
              <input
                id="keyword"
                type="text"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="如：领队套路、试台规则、中介骗局"
              />
            </div>

            <div className="field">
              <span className="label">内容气质</span>
              <div className="radio-group">
                {VIBES.map((vibe) => (
                  <button
                    key={vibe}
                    type="button"
                    className={`radio-btn ${selectedVibe === vibe ? "selected" : ""}`}
                    onClick={() => setSelectedVibe(vibe)}
                  >
                    {vibe}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={generateTopics}
              disabled={topicsLoading}
            >
              生成选题角度
            </button>
          </div>

          {topicsLoading ? (
            <div className="loading">
              <div className="spinner" />
              AI 生成选题中...
            </div>
          ) : null}

          {topicsError ? <div className="notice">生成失败：{topicsError}</div> : null}

          {topics.length > 0 ? (
            <div>
              <div>
                {topics.map((topic, index) => (
                  <button
                    key={`${topic.title}-${index}`}
                    type="button"
                    className={`topic-card ${selectedTopicIndex === index ? "selected" : ""}`}
                    onClick={() => setSelectedTopicIndex(index)}
                  >
                    <div className="topic-title">{topic.title}</div>
                    <div className="topic-meta">
                      <strong>钩子方向：</strong>
                      {topic.hook}
                    </div>
                    <div className="topic-meta topic-meta-spaced">
                      <strong>评论区预判：</strong>
                      {topic.comment}
                    </div>
                    <div className="topic-meta topic-meta-spaced">
                      <strong>气质：</strong>
                      {topic.vibe}
                    </div>
                  </button>
                ))}
              </div>

              <div className="actions">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={selectedTopicIndex === null}
                  onClick={generateScript}
                >
                  用选中选题生成脚本
                </button>
                <button type="button" className="btn-ghost" onClick={generateTopics}>
                  重新生成
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {step === 2 ? (
        <section>
          <div className="card">
            {selectedTopic ? (
              <div className="badge">{selectedTopic.title}</div>
            ) : null}

            {scriptLoading ? (
              <div className="loading">
                <div className="spinner" />
                华仔脚本生成中...
              </div>
            ) : null}

            {!scriptLoading ? (
              <div>
                <div className="script-section">
                  <div className="seg-label">钩子（前3秒）</div>
                  <textarea
                    className="script-box script-textarea"
                    value={script.hook}
                    onChange={(event) => updateScriptPart("hook", event.target.value)}
                  />
                </div>

                <div className="script-section">
                  <div className="seg-label">冲突（戳痛点）</div>
                  <textarea
                    className="script-box script-textarea script-textarea-lg"
                    value={script.conflict}
                    onChange={(event) => updateScriptPart("conflict", event.target.value)}
                  />
                </div>

                <div className="script-section">
                  <div className="seg-label">记忆点</div>
                  <textarea
                    className="script-box script-textarea"
                    value={script.memory}
                    onChange={(event) => updateScriptPart("memory", event.target.value)}
                  />
                </div>

                <div className="script-section">
                  <div className="seg-label">结论（身份锚点+评论区召唤）</div>
                  <textarea
                    className="script-box script-textarea"
                    value={script.conclusion}
                    onChange={(event) => updateScriptPart("conclusion", event.target.value)}
                  />
                </div>

                <div className={`word-count ${countOk ? "ok" : ""}`}>
                  当前字数：{wordCount} 字（目标 330–350 字）
                </div>
                {scriptError ? <div className="notice top-gap">生成失败：{scriptError}</div> : null}
              </div>
            ) : null}
          </div>

          <div className="actions">
            <button type="button" className="btn-primary" onClick={runCheck}>
              违禁词检测
            </button>
            <button type="button" className="btn-ghost" onClick={copyScript}>
              {copyLabel}
            </button>
            <button type="button" className="btn-ghost" onClick={generateScript}>
              重新生成
            </button>
            <button type="button" className="btn-ghost" onClick={() => setStep(1)}>
              ← 返回选题
            </button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section>
          <div className="card">
            <div className="result-title">违禁词检测结果</div>
            {violations.length === 0 ? (
              <div className="success-msg">✓ 未检测到违禁词，可以发布</div>
            ) : (
              <div className="violation-list">
                {violations.map((item, index) => (
                  <div className="vitem" key={`${item.word}-${index}`}>
                    <div className={`vbadge ${item.type}`}>
                      {item.type === "hard" ? "硬违禁" : "软风险"}
                    </div>
                    <div>
                      <div className="vtitle">"{item.word}"</div>
                      <div className="vsuggest">建议替换为：{item.suggest}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="actions">
            <button type="button" className="btn-ghost" onClick={() => setStep(2)}>
              ← 返回脚本
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
