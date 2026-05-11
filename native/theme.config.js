/** @type {const} */
const themeColors = {
  // HJ 런치패드 다크 테마 (딥 네이비 기반)
  primary:    { light: '#00C8FF', dark: '#00C8FF' }, // 시안 강조색
  background: { light: '#0F172A', dark: '#0F172A' }, // 딥 네이비 (라이트도 다크 고정)
  surface:    { light: '#1E293B', dark: '#1E293B' }, // 카드/패널 배경
  surface2:   { light: '#334155', dark: '#334155' }, // 입력 필드, 구분선
  foreground: { light: '#F1F5F9', dark: '#F1F5F9' }, // 주요 텍스트
  muted:      { light: '#94A3B8', dark: '#94A3B8' }, // 보조 텍스트
  border:     { light: '#334155', dark: '#334155' }, // 테두리
  success:    { light: '#22C55E', dark: '#22C55E' }, // ALIVE / SAVED
  warning:    { light: '#F59E0B', dark: '#F59E0B' }, // DEGRADED / WARNING
  error:      { light: '#EF4444', dark: '#EF4444' }, // BROKEN / MISSING / 방어선
  // 엔진 배지 색상
  grok:       { light: '#00C8FF', dark: '#00C8FF' }, // GROK
  gpt:        { light: '#74AA9C', dark: '#74AA9C' }, // GPT
  claude:     { light: '#CC785C', dark: '#CC785C' }, // Claude
};

module.exports = { themeColors };
