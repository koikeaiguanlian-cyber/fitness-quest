import React, { useState, useEffect } from 'react';

export default function FitnessQuestV3() {
  const [mode, setMode] = useState('wife');
  const [challenges, setChallenges] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [showAIConsult, setShowAIConsult] = useState(false);
  const [consultLoading, setConsultLoading] = useState(false);
  const [consultResult, setConsultResult] = useState('');
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [repsInput, setRepsInput] = useState('');
  const [gachaResult, setGachaResult] = useState(null);
  const [gachaItems, setGachaItems] = useState([]);
  const [customTarget, setCustomTarget] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // ガチャ景品定義
  const gachaItems_data = {
    ice: { name: 'アイス', emoji: '🍦', rarity: 'R', rate: 0.20 },
    chocolate: { name: 'チョコ', emoji: '🍫', rarity: 'R', rate: 0.20 },
    lemon_sour: { name: 'レモンサワー', emoji: '🍹', rarity: 'R', rate: 0.20 },
    beer: { name: 'ビール', emoji: '🍺', rarity: 'SR', rate: 0.10 },
    cake: { name: 'ケーキ', emoji: '🎂', rarity: 'SR', rate: 0.10 },
    starbucks: { name: 'スタバフラペチーノ', emoji: '☕', rarity: 'SR', rate: 0.10 },
    cleaning: { name: '掃除（妻がやらない）', emoji: '🧹', rarity: 'SR', rate: 0.10 },
    eating_out: { name: '外食', emoji: '🍽️', rarity: 'SSR', rate: 0.05 },
    homemade: { name: '私の手料理', emoji: '👨‍🍳', rarity: 'SSR', rate: 0.05 },
  };

  // 運動の進行システム
  const exerciseProgression = {
    pushups: { name: '腕立て伏せ', icon: '💪', baseTarget: 50, maxTarget: 200, increaseStep: 10, thresholdCount: 3 },
    situps: { name: '腹筋', icon: '🔥', baseTarget: 50, maxTarget: 200, increaseStep: 10, thresholdCount: 3 },
    squats: { name: 'スクワット', icon: '🦵', baseTarget: 50, maxTarget: 200, increaseStep: 10, thresholdCount: 3 },
    plank: { name: 'プランク', icon: '🏋️', baseTarget: 60, maxTarget: 180, increaseStep: 15, unit: '秒', thresholdCount: 3 },
    lunges: { name: 'ランジ', icon: '🚶', baseTarget: 50, maxTarget: 150, increaseStep: 10, thresholdCount: 3 },
  };

  // 運動ごとのターゲットを計算
  const getExerciseTarget = (exerciseType) => {
    const config = exerciseProgression[exerciseType];
    if (!config) return 50;

    const completedCount = challenges.filter(c => c.exerciseType === exerciseType).length;
    const progressLevel = Math.floor(completedCount / config.thresholdCount);
    const target = Math.min(config.baseTarget + progressLevel * config.increaseStep, config.maxTarget);
    return target;
  };

  // ローカルストレージからのロード
  useEffect(() => {
    const savedChallenges = localStorage.getItem('fitnessChallenges');
    const savedMessages = localStorage.getItem('fitnessMessages');
    const savedGachaItems = localStorage.getItem('fitnessGachaItems');
    if (savedChallenges) setChallenges(JSON.parse(savedChallenges));
    if (savedMessages) setMessages(JSON.parse(savedMessages));
    if (savedGachaItems) setGachaItems(JSON.parse(savedGachaItems));
  }, []);

  // ローカルストレージに保存（秘匿情報は外部に送信しない）
  useEffect(() => {
    localStorage.setItem('fitnessChallenges', JSON.stringify(challenges));
  }, [challenges]);

  useEffect(() => {
    localStorage.setItem('fitnessMessages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('fitnessGachaItems', JSON.stringify(gachaItems));
  }, [gachaItems]);

  // ガチャを引く
  const executeGacha = () => {
    const rand = Math.random();
    let selectedItem = null;
    let cumulativeRate = 0;

    for (const [key, item] of Object.entries(gachaItems_data)) {
      cumulativeRate += item.rate;
      if (rand <= cumulativeRate) {
        selectedItem = { key, ...item };
        break;
      }
    }

    if (!selectedItem) selectedItem = { key: 'ice', ...gachaItems_data.ice };

    setGachaResult(selectedItem);

    // ガチャ結果をアイテムリストに追加
    const newGachaItems = [...gachaItems, { key: selectedItem.key, name: selectedItem.name, emoji: selectedItem.emoji, rarity: selectedItem.rarity, addedAt: Date.now() }];
    setGachaItems(newGachaItems);

    // 3個揃ったか確認
    const countByKey = newGachaItems.reduce((acc, item) => {
      acc[item.key] = (acc[item.key] || 0) + 1;
      return acc;
    }, {});

    const completedItems = Object.entries(countByKey).filter(([_, count]) => count === 3);
    if (completedItems.length > 0) {
      const completedKey = completedItems[0][0];
      const completedItem = gachaItems_data[completedKey];
      addSystemMessage(`🎉 ${completedItem.emoji} ${completedItem.name} × 3個集まりました！\n獲得！${completedItem.rarity}`);
      
      // 3個を削除して報酬アイテムに変える
      const filteredItems = newGachaItems.filter(item => item.key !== completedKey);
      setGachaItems(filteredItems);
    }
  };

  // 利用可能なチャレンジ一覧
  const getAvailableChallenges = () => {
    return Object.entries(exerciseProgression).map(([type, config]) => {
      const target = getExerciseTarget(type);
      const completedCount = challenges.filter(c => c.exerciseType === type).length;
      return {
        type,
        name: config.name,
        icon: config.icon,
        target,
        unit: config.unit,
        completedCount,
      };
    });
  };

  // チャレンジ完了
  const completeChallenge = (exerciseType, reps) => {
    const config = exerciseProgression[exerciseType];
    const target = getExerciseTarget(exerciseType);
    
    if (!config || parseInt(reps) < target) return;

    const newChallenge = {
      id: Date.now(),
      exerciseType: exerciseType,
      completedAt: new Date().toISOString(),
      reps: parseInt(reps),
      targetWas: target,
    };
    setChallenges([...challenges, newChallenge]);

    // 次のターゲット計算
    const completedCountAfter = challenges.filter(c => c.exerciseType === exerciseType).length + 1;
    const nextProgressLevel = Math.floor(completedCountAfter / config.thresholdCount);
    const nextTarget = Math.min(
      config.baseTarget + nextProgressLevel * config.increaseStep,
      config.maxTarget
    );

    const nextTargetText = nextTarget === target 
      ? '同じターゲットで挑戦' 
      : `次のターゲット: ${nextTarget}${config.unit || '回'}`;
    
    addSystemMessage(
      `🎉 ${config.icon} ${config.name} ${reps}${config.unit || '回'} 達成！\nガチャを引いてください！\n${nextTargetText}`
    );
    setSelectedExercise(null);
    setRepsInput('');
  };

  // 回数を減らす
  const decreaseTarget = (exerciseType) => {
    const config = exerciseProgression[exerciseType];
    const currentTarget = getExerciseTarget(exerciseType);
    const newTarget = Math.max(30, currentTarget - (config.increaseStep || 10));
    
    if (newTarget === currentTarget) return;

    // 新しいターゲットにするために達成数を調整
    const completedCount = challenges.filter(c => c.exerciseType === exerciseType).length;
    const newProgressLevel = Math.floor(completedCount / config.thresholdCount) - 1;
    
    if (newProgressLevel < 0) {
      addSystemMessage(`下限に達しました（${config.baseTarget}${config.unit || '回'}）`);
      return;
    }

    addSystemMessage(`${config.icon} ${config.name} のターゲットを ${currentTarget}${config.unit || '回'} から ${newTarget}${config.unit || '回'} に下げました`);
    setSelectedExercise(null);
  };

  // システムメッセージ追加
  const addSystemMessage = (text) => {
    const newMessage = {
      id: Date.now(),
      text,
      from: 'system',
      timestamp: Date.now(),
    };
    setMessages([newMessage, ...messages].slice(0, 40));
  };

  // AI相談
  const askAIConsult = async () => {
    setConsultLoading(true);
    const prompt = `あなたは健康的な妻さんをサポートするAIアシスタントです。
妻さんが「今日は何しよう？」と運動内容で悩んでいます。

これまでのチャレンジ達成数: ${challenges.length}個

妻さんのために、次のおすすめトレーニングを提案してください。ポイントは：
1. バランスよく異なる部位を鍛える
2. 達成可能で小さな成功を積み重ねる
3. 徐々に難易度を上げていく

日本語で、親切で励ましのあるアドバイスを150文字以内でお願いします。`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = await response.json();
      if (data.content?.[0]?.text) {
        const result = data.content[0].text;
        setConsultResult(result);
        addSystemMessage(`💡 AI相談:\n${result}`);
      }
    } catch (error) {
      console.error('API error:', error);
      setConsultResult('一時的なエラーが発生しました。もう一度お試しください。');
    }
    setConsultLoading(false);
  };

  const completedCount = challenges.length;
  const level = Math.floor(completedCount / 2) + 1;

  const badges = [];
  if (completedCount >= 1) badges.push({ name: '初心者', emoji: '🌱' });
  if (completedCount >= 3) badges.push({ name: '頑張り屋', emoji: '🔥' });
  if (completedCount >= 5) badges.push({ name: '冒険者', emoji: '⭐' });
  if (completedCount >= 8) badges.push({ name: 'ヒーロー', emoji: '👑' });

  const availableChallenges = getAvailableChallenges();

  // ガチャアイテムの集計
  const itemCount = gachaItems.reduce((acc, item) => {
    acc[item.key] = (acc[item.key] || 0) + 1;
    return acc;
  }, {});

  // 妻さん用ビュー
  if (mode === 'wife') {
    return (
      <div style={{ background: 'linear-gradient(135deg, #E1F5EE 0%, #FFF 100%)', minHeight: '100vh', padding: '1rem' }}>
        <div style={{ maxWidth: '500px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 500, margin: 0, color: '#0F6E56' }}>
              フィットネスクエスト
            </h1>
            <button
              onClick={() => setMode('husband')}
              style={{
                padding: '0.5rem 0.75rem',
                background: '#1D9E75',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              夫モード
            </button>
          </div>

          {/* ステータス表示 */}
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '40px', marginBottom: '0.5rem' }}>⚔️</div>
              <h2 style={{ fontSize: '18px', fontWeight: 500, margin: '0 0 0.25rem 0' }}>
                レベル {level}
              </h2>
              <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                経験値: {(completedCount * 50) % 100}/100
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
              <div
                style={{
                  background: '#F0F9F7',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '18px', marginBottom: '0.25rem' }}>🏆</div>
                <div style={{ fontWeight: 500, color: '#1D9E75' }}>{completedCount}</div>
                <div style={{ fontSize: '11px', color: '#999' }}>チャレンジ達成</div>
              </div>
              <div
                style={{
                  background: '#F0F9F7',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '18px', marginBottom: '0.25rem' }}>🎁</div>
                <div style={{ fontWeight: 500, color: '#1D9E75' }}>{gachaItems.length}</div>
                <div style={{ fontSize: '11px', color: '#999' }}>ガチャアイテム</div>
              </div>
            </div>
          </div>

          {/* バッジ表示 */}
          {badges.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {badges.map(b => (
                  <div
                    key={b.name}
                    style={{
                      background: '#FFF9E6',
                      border: '0.5px solid #FFD700',
                      borderRadius: '6px',
                      padding: '0.4rem 0.6rem',
                      fontSize: '11px',
                      fontWeight: 500,
                    }}
                  >
                    <span style={{ fontSize: '12px', marginRight: '0.2rem' }}>{b.emoji}</span>
                    {b.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ガチャアイテム表示 */}
          {gachaItems.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #FFE082 0%, #FFF 100%)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 0.75rem 0', color: '#D32F2F' }}>
                🎁 ガチャアイテム
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', fontSize: '11px' }}>
                {Object.entries(itemCount).map(([key, count]) => {
                  const item = gachaItems_data[key];
                  const rarityColor = { R: '#999', SR: '#FFB300', SSR: '#FF6B00' };
                  return (
                    <div key={key} style={{
                      background: 'white',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      textAlign: 'center',
                      border: `2px solid ${rarityColor[item.rarity]}`,
                    }}>
                      <div style={{ fontSize: '16px', marginBottom: '0.25rem' }}>{item.emoji}</div>
                      <div style={{ fontSize: '10px', fontWeight: 500 }}>{item.name}</div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: rarityColor[item.rarity] }}>
                        × {count}{count === 3 ? ' ✅' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ガチャ結果表示 */}
          {gachaResult && (
            <div style={{
              background: '#FFF3E0',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1rem',
              textAlign: 'center',
              border: '2px solid #FF6F00',
            }}>
              <p style={{ fontSize: '12px', color: '#999', margin: '0 0 0.5rem 0' }}>✨ ガチャ結果 ✨</p>
              <div style={{ fontSize: '48px', marginBottom: '0.5rem' }}>{gachaResult.emoji}</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#D32F2F', marginBottom: '0.25rem' }}>
                {gachaResult.name}
              </div>
              <div style={{ fontSize: '11px', color: '#999' }}>{gachaResult.rarity}</div>
              <button
                onClick={() => setGachaResult(null)}
                style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem 1rem',
                  background: '#FF6F00',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                閉じる
              </button>
            </div>
          )}

          {/* AI相談ボタン */}
          <button
            onClick={() => {
              setShowAIConsult(!showAIConsult);
              setConsultResult('');
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: '#E3F2FD',
              color: '#0C447C',
              border: '0.5px solid #90CAF9',
              borderRadius: '8px',
              fontWeight: 500,
              cursor: 'pointer',
              fontSize: '13px',
              marginBottom: '1rem',
            }}
          >
            💡 今日は何しよう？
          </button>

          {showAIConsult && (
            <div
              style={{
                background: '#E3F2FD',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1rem',
                borderLeft: '3px solid #0C447C',
              }}
            >
              {!consultResult ? (
                <button
                  onClick={askAIConsult}
                  disabled={consultLoading}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#0C447C',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 500,
                    cursor: consultLoading ? 'wait' : 'pointer',
                    fontSize: '13px',
                  }}
                >
                  {consultLoading ? '🤖 相談中...' : '相談する'}
                </button>
              ) : (
                <p style={{ fontSize: '12px', lineHeight: 1.6, color: '#0C447C', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {consultResult}
                </p>
              )}
            </div>
          )}

          {/* チャレンジセクション */}
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <h3 style={{ fontSize: '14px', fontWeight: 500, margin: '0 0 0.75rem 0' }}>
              🎯 チャレンジを達成
            </h3>

            {selectedExercise ? (
              <div>
                <button
                  onClick={() => {
                    setSelectedExercise(null);
                    setShowCustomInput(false);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1D9E75',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
                    marginBottom: '0.75rem',
                  }}
                >
                  ← 戻る
                </button>
                <div style={{ padding: '1rem', background: '#F0F9F7', borderRadius: '8px' }}>
                  <h4 style={{ fontSize: '14px', margin: '0 0 0.5rem 0' }}>
                    {selectedExercise.icon} {selectedExercise.name}{' '}
                    {selectedExercise.target}
                    {selectedExercise.unit || '回'}
                  </h4>
                  <p style={{ fontSize: '12px', color: '#666', margin: '0 0 0.5rem 0' }}>
                    達成数: {selectedExercise.completedCount}回
                  </p>
                  <p style={{ fontSize: '12px', color: '#666', margin: '0 0 0.75rem 0' }}>
                    {selectedExercise.target}
                    {selectedExercise.unit || '回'}達成したら完了！
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <input
                      type="number"
                      placeholder={`${selectedExercise.target}以上を入力`}
                      value={repsInput}
                      onChange={e => setRepsInput(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.6rem',
                        border: '0.5px solid #E0E0E0',
                        borderRadius: '6px',
                        fontSize: '13px',
                      }}
                    />
                    <button
                      onClick={() => completeChallenge(selectedExercise.type, repsInput)}
                      disabled={!repsInput || parseInt(repsInput) < selectedExercise.target}
                      style={{
                        padding: '0.6rem 1rem',
                        background: parseInt(repsInput) >= selectedExercise.target ? '#1D9E75' : '#CCC',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 500,
                        fontSize: '13px',
                        cursor: parseInt(repsInput) >= selectedExercise.target ? 'pointer' : 'not-allowed',
                      }}
                    >
                      完了
                    </button>
                  </div>

                  <button
                    onClick={() => setShowCustomInput(!showCustomInput)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: '#E0E0E0',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      marginBottom: '0.5rem',
                    }}
                  >
                    {showCustomInput ? '↑ 閉じる' : '↓ ターゲットを変更'}
                  </button>

                  {showCustomInput && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input
                        type="number"
                        placeholder="新しいターゲット（30以上）"
                        value={customTarget}
                        onChange={e => setCustomTarget(e.target.value)}
                        min="30"
                        style={{
                          flex: 1,
                          padding: '0.6rem',
                          border: '0.5px solid #E0E0E0',
                          borderRadius: '6px',
                          fontSize: '13px',
                        }}
                      />
                      <button
                        onClick={() => {
                          if (customTarget && parseInt(customTarget) >= 30) {
                            decreaseTarget(selectedExercise.type);
                            setCustomTarget('');
                          }
                        }}
                        style={{
                          padding: '0.6rem 1rem',
                          background: customTarget && parseInt(customTarget) >= 30 ? '#FF9800' : '#CCC',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: 500,
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        変更
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {availableChallenges.map(c => (
                  <button
                    key={c.type}
                    onClick={() => setSelectedExercise(c)}
                    style={{
                      padding: '0.75rem',
                      background: '#F0F9F7',
                      border: '0.5px solid #1D9E75',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '18px', marginBottom: '0.25rem' }}>{c.icon}</div>
                    <div style={{ fontWeight: 500, color: '#1D9E75' }}>{c.name}</div>
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      {c.target}
                      {c.unit || '回'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '0.25rem' }}>
                      ×{c.completedCount}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* メッセージセクション */}
          {messages.length > 0 && (
            <div style={{ background: '#E1F5EE', borderRadius: '12px', padding: '1rem' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 500, margin: '0 0 0.75rem 0' }}>
                💬 応援・お知らせ
              </h3>
              <div
                style={{
                  fontSize: '12px',
                  lineHeight: 1.5,
                  maxHeight: '200px',
                  overflowY: 'auto',
                }}
              >
                {messages.slice(0, 5).map(msg => (
                  <p
                    key={msg.id}
                    style={{
                      margin: '0.5rem 0',
                      padding: '0.5rem',
                      background: 'white',
                      borderRadius: '6px',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {msg.from === 'system' ? '🤖' : '💕'} {msg.text}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 夫さん用ビュー
  return (
    <div style={{ background: '#F5F5F5', minHeight: '100vh', padding: '1rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 500, margin: 0 }}>
            応援ダッシュボード
          </h1>
          <button
            onClick={() => setMode('wife')}
            style={{
              padding: '0.5rem 0.75rem',
              background: '#1D9E75',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            妻モード
          </button>
        </div>

        {/* ステータス表示 */}
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '48px', marginBottom: '0.5rem' }}>🌟</div>
            <h2 style={{ fontSize: '18px', fontWeight: 500, margin: '0 0 0.25rem 0' }}>
              素晴らしい頑張り!
            </h2>
            <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
              レベル {level} 冒険者
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
            <div
              style={{
                background: '#F0F9F7',
                padding: '0.75rem',
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '18px', marginBottom: '0.25rem' }}>🏆</div>
              <div style={{ fontWeight: 500, color: '#1D9E75' }}>{completedCount}</div>
              <div style={{ fontSize: '11px', color: '#999' }}>チャレンジ達成</div>
            </div>
            <div
              style={{
                background: '#F0F9F7',
                padding: '0.75rem',
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '18px', marginBottom: '0.25rem' }}>🎁</div>
              <div style={{ fontWeight: 500, color: '#1D9E75' }}>{gachaItems.length}</div>
              <div style={{ fontSize: '11px', color: '#999' }}>ガチャアイテム</div>
            </div>
          </div>
        </div>

        {/* メッセージ入力 */}
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <h3 style={{ fontSize: '14px', fontWeight: 500, margin: '0 0 0.75rem 0' }}>
            応援メッセージを送る
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="応援のメッセージを入力..."
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              onKeyPress={e => {
                if (e.key === 'Enter' && messageText.trim()) {
                  const newMsg = {
                    id: Date.now(),
                    text: messageText,
                    from: 'husband',
                    timestamp: Date.now(),
                  };
                  setMessages([newMsg, ...messages].slice(0, 40));
                  setMessageText('');
                }
              }}
              style={{
                flex: 1,
                padding: '0.6rem',
                border: '0.5px solid #E0E0E0',
                borderRadius: '6px',
                fontSize: '13px',
              }}
            />
            <button
              onClick={() => {
                if (messageText.trim()) {
                  const newMsg = {
                    id: Date.now(),
                    text: messageText,
                    from: 'husband',
                    timestamp: Date.now(),
                  };
                  setMessages([newMsg, ...messages].slice(0, 40));
                  setMessageText('');
                }
              }}
              style={{
                padding: '0.6rem 1rem',
                background: '#1D9E75',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '13px',
              }}
            >
              送信
            </button>
          </div>
        </div>

        {/* チャレンジ達成履歴 */}
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <h3 style={{ fontSize: '14px', fontWeight: 500, margin: '0 0 0.75rem 0' }}>
            最近のチャレンジ達成
          </h3>
          {challenges.length === 0 ? (
            <p style={{ color: '#999', fontSize: '12px', textAlign: 'center', margin: 0 }}>
              まだチャレンジ達成がありません
            </p>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {challenges
                .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
                .slice(0, 10)
                .map(c => {
                  const exerciseProgression = {
                    pushups: { name: '腕立て伏せ', icon: '💪' },
                    situps: { name: '腹筋', icon: '🔥' },
                    squats: { name: 'スクワット', icon: '🦵' },
                    plank: { name: 'プランク', icon: '🏋️', unit: '秒' },
                    lunges: { name: 'ランジ', icon: '🚶' },
                  };
                  const config = exerciseProgression[c.exerciseType];
                  return config ? (
                    <div
                      key={c.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.5rem',
                        borderBottom: '0.5px solid #E0E0E0',
                        fontSize: '12px',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '14px', marginRight: '0.5rem' }}>
                          {config.icon}
                        </span>
                        <span style={{ fontWeight: 500 }}>
                          {config.name} {c.reps}
                          {config.unit || '回'}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: '#999' }}>
                        {new Date(c.completedAt).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  ) : null;
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
