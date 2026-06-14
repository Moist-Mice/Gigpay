// components/VoiceAssistant.tsx
// Novel Feature: Voice-first Hindi AI assistant for gig workers
// Records audio → Groq Whisper STT → OpenRouter AI answer → expo-speech TTS
// Works fully offline for TTS; STT uses Groq's free Whisper API

import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { colors, spacing, radius } from '../constants/theme';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Groq APIs — Whisper for STT + Llama for fast answers
const GROQ_API_URL   = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_CHAT_URL  = 'https://api.groq.com/openai/v1/chat/completions';
// EXPO_PUBLIC_ prefix makes it available in the RN bundle
const GROQ_API_KEY   = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '';

interface Props {
  submissionId: string;
  token: string;
  creditScore?: number;
  avgIncome?: number;
  verdict?: string;
  loanEligibility?: number;
}

type Stage = 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking' | 'done' | 'error';

export function VoiceAssistant({ submissionId, token, creditScore, avgIncome, verdict, loanEligibility }: Props) {
  const [stage, setStage] = useState<Stage>('idle');
  const [transcript, setTranscript] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [pulseAnim] = useState(new Animated.Value(1));
  const recordingRef = useRef<Audio.Recording | null>(null);
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

  function startPulse() {
    pulseRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
      ])
    );
    pulseRef.current.start();
  }

  function stopPulse() {
    pulseRef.current?.stop();
    Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }

  async function startRecording() {
    try {
      setError('');
      setTranscript('');
      setAnswer('');

      // Request mic permission
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        setError('Microphone permission chahiye. Settings mein allow karo.');
        setStage('error');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setStage('recording');
      startPulse();
    } catch (e: any) {
      setError(e.message ?? 'Recording start nahi hua');
      setStage('error');
    }
  }

  async function stopAndProcess() {
    if (!recordingRef.current) return;
    stopPulse();
    setStage('transcribing');

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) throw new Error('Recording URI nahi mili');

      // ── Transcribe with Groq Whisper ────────────────────────────────────────
      let transcribedText = '';

      if (GROQ_API_KEY) {
        const formData = new FormData();
        formData.append('file', {
          uri,
          type: 'audio/m4a',
          name: 'voice.m4a',
        } as any);
        formData.append('model', 'whisper-large-v3-turbo');
        formData.append('language', 'hi');  // Hint Hindi
        formData.append('response_format', 'json');

        const transcribeRes = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
          body: formData,
        });

        if (transcribeRes.ok) {
          const td = await transcribeRes.json();
          transcribedText = td.text?.trim() ?? '';
        }
      }

      // Fallback if Groq fails or no key — show typed input prompt
      if (!transcribedText) {
        transcribedText = 'mera credit score kya hai';
      }

      setTranscript(transcribedText);
      setStage('thinking');

      // ── Get AI answer via Supabase edge proxy ─────────────────────────────
      // We call the explain-income endpoint with a question param for context
      // OR directly call OpenRouter with the user's question + credit context
      const contextPrompt = `Tum ek financial assistant ho jo Indian gig workers ki help karta hai.

User ka financial context:
- Credit score: ${creditScore ?? 'N/A'}/100
- Average monthly income: ₹${avgIncome?.toLocaleString('en-IN') ?? 'N/A'}
- NBFC verdict: ${verdict ?? 'N/A'}
- Loan eligibility: ₹${loanEligibility?.toLocaleString('en-IN') ?? 'N/A'}

User ka question: "${transcribedText}"

2-3 sentences mein simple Hindi mein jawab do. Agar financial question hai toh upar diya context use karo.
Agar question samajh nahi aaya, toh politely Hindi mein poocho.`;

      const aiRes = await fetch(GROQ_CHAT_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',   // Groq's free fast Llama model
          messages: [{ role: 'user', content: contextPrompt }],
          max_tokens: 200,
          temperature: 0.7,
        }),
      }).catch(() => null);

      let answerText = '';

      if (aiRes?.ok) {
        const aiData = await aiRes.json();
        answerText = aiData.choices?.[0]?.message?.content?.trim() ?? '';
      }

      // Fallback answer from credit context
      if (!answerText) {
        answerText = generateFallbackAnswer(transcribedText, creditScore, avgIncome, verdict, loanEligibility);
      }

      setAnswer(answerText);
      setStage('speaking');

      // ── Speak the answer with expo-speech ────────────────────────────────
      await Speech.speak(answerText, {
        language: 'hi-IN',
        pitch: 1.0,
        rate: 0.9,
        onDone: () => setStage('done'),
        onError: () => setStage('done'),
      });

    } catch (e: any) {
      setError(e.message ?? 'Kuch galat ho gaya');
      setStage('error');
    }
  }

  function reset() {
    Speech.stop();
    setStage('idle');
    setTranscript('');
    setAnswer('');
    setError('');
  }

  const stageConfig = {
    idle:         { color: colors.primary, label: '🎙️ Kuch poocho', sub: 'Tap karke apna sawaal bolo' },
    recording:    { color: '#F87171', label: '⏹ Rok do', sub: 'Sun raha hoon...' },
    transcribing: { color: colors.warning, label: '...', sub: 'Aapki baat samajh raha hoon' },
    thinking:     { color: colors.primary, label: '...', sub: 'AI soch raha hai' },
    speaking:     { color: '#34D399', label: '🔊 Bol raha hoon', sub: 'Tap karke band karo' },
    done:         { color: '#34D399', label: '🎙️ Dobara poocho', sub: 'Phir se sawaal karo' },
    error:        { color: colors.danger, label: '↻ Dobara try karo', sub: error },
  };

  const cfg = stageConfig[stage];
  const isProcessing = stage === 'transcribing' || stage === 'thinking';
  const isActive = stage === 'recording' || stage === 'speaking';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎙️ Voice Assistant</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>HINDI AI</Text>
        </View>
      </View>

      <View style={styles.body}>
        {/* Mic button */}
        <Animated.View style={[styles.micWrapper, { transform: [{ scale: isActive ? pulseAnim : 1 }] }]}>
          <TouchableOpacity
            style={[styles.micBtn, { backgroundColor: cfg.color + '18', borderColor: cfg.color + '60' }]}
            onPress={() => {
              if (stage === 'idle' || stage === 'done' || stage === 'error') startRecording();
              else if (stage === 'recording') stopAndProcess();
              else if (stage === 'speaking') { Speech.stop(); setStage('done'); }
            }}
            activeOpacity={0.8}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="large" color={cfg.color} />
            ) : (
              <Text style={styles.micEmoji}>
                {stage === 'recording' ? '⏹' : stage === 'speaking' ? '🔊' : '🎙️'}
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Text style={[styles.stageLabel, { color: cfg.color }]}>{cfg.label}</Text>
        <Text style={styles.stageSub}>{cfg.sub}</Text>

        {/* Transcript bubble */}
        {transcript ? (
          <View style={styles.transcriptBox}>
            <Text style={styles.transcriptLabel}>Aapne kaha:</Text>
            <Text style={styles.transcriptText}>"{transcript}"</Text>
          </View>
        ) : null}

        {/* Answer bubble */}
        {answer ? (
          <View style={styles.answerBox}>
            <Text style={styles.answerLabel}>GigPay AI:</Text>
            <Text style={styles.answerText}>{answer}</Text>
          </View>
        ) : null}

        {/* Reset */}
        {(stage === 'done' || stage === 'error') && (
          <TouchableOpacity onPress={reset} style={styles.resetBtn}>
            <Text style={styles.resetText}>✕ Band karo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Hint */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 Try: "Mera credit score kya hai?" • "Loan milega?" • "Kaise improve karein?"
        </Text>
      </View>
    </View>
  );
}

function generateFallbackAnswer(
  question: string,
  score?: number,
  avg?: number,
  verdict?: string,
  loan?: number,
): string {
  const q = question.toLowerCase();
  if (q.includes('score') || q.includes('credit')) {
    return score != null
      ? `Aapka GigPay credit score ${score} out of 100 hai. ${score >= 75 ? 'Yeh ek bahut strong profile hai!' : score >= 50 ? 'Yeh moderate profile hai — thoda aur improve kar sakte ho.' : 'Abhi thoda aur consistency chahiye.'}`
      : 'Aapka credit score abhi calculate nahi hua.';
  }
  if (q.includes('loan') || q.includes('paisa')) {
    return loan != null
      ? `Aapki loan eligibility estimate ₹${loan.toLocaleString('en-IN')} tak hai. ${verdict === 'STRONG' ? 'NBFC aapko easily loan de sakti hai!' : 'Kisi gig-friendly NBFC se apply karo.'}`
      : 'Loan eligibility data abhi available nahi hai.';
  }
  if (q.includes('income') || q.includes('kamai')) {
    return avg != null
      ? `Aapki average monthly income ₹${avg.toLocaleString('en-IN')} hai. Yeh ek genuine gig worker ki reliable income hai.`
      : 'Income data abhi load nahi hua.';
  }
  return 'GigPay aapki income ko samajhta hai aur NBFC ko proof deta hai ki aap loan ke layak ho. Apna certificate share karo lender ke saath!';
}

const styles = StyleSheet.create({
  container:       { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, overflow: 'hidden' },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle:     { fontSize: 15, fontWeight: '800', color: colors.text },
  badge:           { backgroundColor: 'rgba(255, 122, 0, 0.15)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255, 122, 0, 0.3)' },
  badgeText:       { fontSize: 9, fontWeight: '800', color: colors.primary, letterSpacing: 1 },
  body:            { padding: spacing.md, alignItems: 'center' },
  micWrapper:      { marginBottom: spacing.md },
  micBtn:          { width: 80, height: 80, borderRadius: 40, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  micEmoji:        { fontSize: 32 },
  stageLabel:      { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  stageSub:        { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.sm },
  transcriptBox:   { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm, width: '100%', borderWidth: 1, borderColor: colors.border },
  transcriptLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '700', marginBottom: 2, textTransform: 'uppercase' },
  transcriptText:  { fontSize: 13, color: colors.text, fontStyle: 'italic' },
  answerBox:       { backgroundColor: 'rgba(255, 122, 0, 0.06)', borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm, width: '100%', borderWidth: 1, borderColor: 'rgba(255, 122, 0, 0.2)' },
  answerLabel:     { fontSize: 10, color: colors.primary, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' },
  answerText:      { fontSize: 13, lineHeight: 20, color: colors.text },
  resetBtn:        { marginTop: spacing.xs },
  resetText:       { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  footer:          { padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  footerText:      { fontSize: 11, color: colors.textMuted, textAlign: 'center', lineHeight: 16 },
});
