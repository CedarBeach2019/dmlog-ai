// src/game/audio-pipeline.ts
// DMLog.ai - ElevenLabs TTS Integration for Simulated Game Sessions

export interface VoiceProfile {
  id: string;
  name: string;
  elevenLabsVoiceId: string;
  characterName: string;
  settings: {
    stability: number;
    similarity_boost: number;
    style: number;
  };
}

export interface AudioSegment {
  id: string;
  voiceId: string;
  text: string;
  characterName: string;
  type: 'narration' | 'dialogue' | 'effect' | 'music';
  durationMs: number;
  audioUrl?: string;
}

export interface AudioSession {
  id: string;
  segments: AudioSegment[];
  status: 'building' | 'generating' | 'mixing' | 'ready' | 'playing';
  createdAt: number;
}

export class AudioPipeline {
  private voices: Map<string, VoiceProfile> = new Map();
  private sessions: Map<string, AudioSession> = new Map();
  private defaultNarratorId: string = 'narrator_default';

  constructor() {
    // Register a default DM narrator voice
    this.registerVoice(
      this.defaultNarratorId,
      '21m00Tcm4TlvDq8ikWAM', // ElevenLabs "Rachel" voice ID
      'Dungeon Master',
      { stability: 0.8, similarity_boost: 0.75, style: 0.4 }
    );
  }

  registerVoice(
    name: string,
    elevenLabsVoiceId: string,
    characterName: string,
    settings: VoiceProfile['settings']
  ): VoiceProfile {
    const id = `voice_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    const profile: VoiceProfile = { id, name, elevenLabsVoiceId, characterName, settings };
    this.voices.set(id, profile);
    return profile;
  }

  getVoices(): VoiceProfile[] {
    return Array.from(this.voices.values());
  }

  createSession(): AudioSession {
    const session: AudioSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      segments: [],
      status: 'building',
      createdAt: Date.now(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  addNarration(sessionId: string, text: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'building') throw new Error('Invalid or locked session');

    const narrator = this.voices.get(this.defaultNarratorId)!;
    session.segments.push({
      id: `seg_${session.segments.length}_${Date.now()}`,
      voiceId: narrator.id,
      text,
      characterName: narrator.characterName,
      type: 'narration',
      durationMs: Math.ceil(text.length / 15) * 1000, // Rough estimation
    });
  }

  addDialogue(sessionId: string, characterName: string, text: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'building') throw new Error('Invalid or locked session');

    const voice = Array.from(this.voices.values()).find(v => v.characterName === characterName);
    if (!voice) throw new Error(`No voice profile found for character: ${characterName}`);

    session.segments.push({
      id: `seg_${session.segments.length}_${Date.now()}`,
      voiceId: voice.id,
      text,
      characterName,
      type: 'dialogue',
      durationMs: Math.ceil(text.length / 15) * 1000,
    });
  }

  addEffect(sessionId: string, effectName: 'battle' | 'tavern' | 'forest' | 'dungeon'): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'building') throw new Error('Invalid or locked session');

    const effectDurations: Record<string, number> = { battle: 5000, tavern: 4000, forest: 6000, dungeon: 5000 };
    session.segments.push({
      id: `seg_${session.segments.length}_${Date.now()}`,
      voiceId: '',
      text: effectName,
      characterName: 'System',
      type: 'effect',
      durationMs: effectDurations[effectName] || 3000,
    });
  }

  async generateAudio(sessionId: string, elevenLabsApiKey: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    
    session.status = 'generating';

    for (const segment of session.segments) {
      if (segment.type === 'effect' || segment.type === 'music') {
        // Effects/Music can be handled by local assets in a real implementation
        segment.audioUrl = `asset://${segment.text}`;
        continue;
      }

      const voice = this.voices.get(segment.voiceId);
      if (!voice) continue;

      try {
        const resp = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voice.elevenLabsVoiceId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'xi-api-key': elevenLabsApiKey },
          body: JSON.stringify({
            text: segment.text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: voice.settings,
          }),
        });

        if (!resp.ok) throw new Error(`ElevenLabs API Error: ${resp.status}`);

        const audioBlob = await resp.blob();
        segment.audioUrl = await this.blobToBase64(audioBlob);
      } catch (error) {
        console.error(`Failed to generate audio for segment ${segment.id}:`, error);
        segment.audioUrl = undefined;
      }
    }

    session.status = 'ready';
  }

  getSessionPlaylist(sessionId: string): AudioSegment[] {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    return session.segments.filter(s => s.audioUrl);
  }

  serialize(session: AudioSession): string {
    return JSON.stringify(session);
  }

  deserialize(json: string): AudioSession {
    const session: AudioSession = JSON.parse(json);
    this.sessions.set(session.id, session);
    return session;
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}