import axios from 'axios';
import { useAdminStore } from '@/store/adminStore';

const PANEL_BASE = 'https://panel.kaszuby24.pl/api';

export const adminApi = axios.create({
  baseURL: PANEL_BASE,
  timeout: 20000,
});

adminApi.interceptors.request.use((config) => {
  const token = useAdminStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      useAdminStore.getState().clearAuth();
    }
    return Promise.reject(err);
  }
);

// ── Auth ────────────────────────────────────────────────────────────────────
export const login = (username: string, password: string) =>
  adminApi.post('/auth/login', { username, password });

// ── Articles ────────────────────────────────────────────────────────────────
export const getArticles = (params: {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
}) => adminApi.get('/articles', { params });

export const getArticle = (id: number) => adminApi.get(`/articles/${id}`);

export interface PollOption {
  id: string;
  label: string;
}

export interface PollData {
  question: string;
  options: PollOption[];
  active?: boolean;
}

export interface ArticlePayload {
  title?: string;
  content?: string;
  excerpt?: string;
  status?: string;
  published_at?: string;
  scheduled_at?: string | null;
  featured_image_url?: string;
  category_ids?: number[];
  tag_ids?: number[];
  meta_zrodlo?: string;
  meta_foto?: string;
  meta_youtube?: string;
  meta_flickr?: string;
  meta_galeria?: string;
  seo_title?: string;
  seo_description?: string;
  seo_focus_keyword?: string;
  seo_canonical?: string;
  og_image_url?: string;
  seo_noindex?: boolean;
  custom_html?: string;
  fb_text?: string;
  fb_auto_post?: boolean;
  poll_data?: PollData | null;
}

export const createArticle = (data: ArticlePayload) =>
  adminApi.post('/articles', data);

export const updateArticle = (id: number, data: ArticlePayload) =>
  adminApi.put(`/articles/${id}`, data);

export const publishArticle = (id: number) =>
  adminApi.post(`/articles/${id}/publish`);

export const unpublishArticle = (id: number) =>
  adminApi.post(`/articles/${id}/unpublish`);

// ── Upload ───────────────────────────────────────────────────────────────────
export const uploadImage = async (uri: string): Promise<{ url: string; fileName: string; size: number }> => {
  const formData = new FormData();
  const name = uri.split('/').pop() || `image-${Date.now()}.jpg`;
  const ext = (name.split('.').pop() || 'jpg').toLowerCase();
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  // @ts-ignore — React Native FormData file object
  formData.append('file', { uri, name, type: mime });

  const token = useAdminStore.getState().token;
  const res = await fetch(`${PANEL_BASE}/upload/image`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || `Upload failed (${res.status})`);
  }
  return res.json();
};

// ── Categories & Tags ────────────────────────────────────────────────────────
export const getCategories = () => adminApi.get('/articles/meta/categories');

export const searchTags = (search: string) =>
  adminApi.get('/articles/meta/tags', { params: { search } });

export const findOrCreateTags = (names: string[]) =>
  adminApi.post('/articles/meta/tags/find-or-create', { names });

// ── Calendar ─────────────────────────────────────────────────────────────────
export const getCalendar = (year: number, month: number) =>
  adminApi.get('/news/calendar', { params: { year, month } });

// ── Audio (TTS via ElevenLabs) ──────────────────────────────────────────────
export interface AudioInfo {
  audio_url: string | null;
  chars_used: number | null;
  generated_at: string | null;
  voice_id: string | null;
}

export const getAudioInfo = (articleId: number) =>
  adminApi.get<AudioInfo>(`/audio/${articleId}`);

export const generateAudio = (articleId: number, force = false) =>
  adminApi.post(`/audio/generate/${articleId}`, { force });

export const deleteAudio = (articleId: number) =>
  adminApi.delete(`/audio/${articleId}`);

// ── AI (article assistant) ──────────────────────────────────────────────────
export interface AiSeoResult {
  seo_title?: string;
  seo_description?: string;
  excerpt?: string;
  fb_text?: string;
  suggested_tags?: string[];
}

export const aiSeo = (title: string, content: string, category?: string) =>
  adminApi.post<{ success: boolean } & AiSeoResult>('/articles/ai/seo', { title, content, category });

export type AiChatAction = 'rewrite' | 'shorten' | 'expand' | 'first-person' | 'fix-grammar' | 'custom';

export const aiChat = (title: string, content: string, action: AiChatAction, customPrompt?: string) =>
  adminApi.post<{ success: boolean; proposed_content: string }>('/articles/ai/chat', {
    title, content, action, customPrompt,
  });

export const aiGenerateContent = (title: string, brief: string, category?: string) =>
  adminApi.post<{ success: boolean; content: string; excerpt: string; fb_text: string }>(
    '/articles/ai/generate-content', { title, brief, category }
  );

// ── FB Graphic Card Preview ─────────────────────────────────────────────────
export const previewFbCard = (data: {
  imageUrl: string;
  title: string;
  excerpt?: string;
  postId?: number;
  force?: boolean;
}) => adminApi.post<{ url: string }>('/news/preview-card', data);

// ── Reels (FB video generator) ───────────────────────────────────────────────
export type ReelTemplateId = 'keypoints' | 'teleprompter' | 'breaking';

export interface ReelJob {
  id: string;
  articleId: number;
  templateId: ReelTemplateId;
  status: 'pending' | 'generating_script' | 'generating_audio' | 'rendering' | 'uploading' | 'done' | 'error';
  progress: number;
  reelUrl?: string;
  fbDescription?: string;
  scriptData?: { titleShort?: string; points?: string[] };
  error?: string;
}

export const generateReel = (articleId: number, templateId: ReelTemplateId) =>
  adminApi.post(`/reels/generate/${articleId}`, { templateId });

export const getReelStatus = (jobId: string) =>
  adminApi.get<ReelJob>(`/reels/status/${jobId}`);

export const publishReelToFb = (jobId: string, data: { message?: string; scheduledAt?: string }) =>
  adminApi.post(`/reels/${jobId}/publish-fb`, data);

// ── FB Plan ──────────────────────────────────────────────────────────────────
export const getFbPlan = (limit = 60) =>
  adminApi.get('/news/fb-plan', { params: { limit } });

export const toggleFbPost = (postId: number) =>
  adminApi.post(`/news/fb-plan/${postId}/toggle`);

export const publishFbNow = (postId: number) =>
  adminApi.post(`/news/fb-plan/${postId}/publish-now`);

export const getFbTokenStatus = () =>
  adminApi.get('/news/fb-token-status');

// ── Push Notifications ───────────────────────────────────────────────────────
export const getPushStats = () => adminApi.get('/push/stats');

export const getPushHistory = (per_page = 30) =>
  adminApi.get('/push/history', { params: { per_page } });

export const sendPushNotification = (data: {
  title: string;
  body: string;
  url?: string;
  image?: string;
}) => adminApi.post('/push/send', data);

// ── Analytics ───────────────────────────────────────────────────────────────
export const getAnalyticsRealtime = () => adminApi.get('/analytics/realtime');

export const getAnalyticsGa4 = (days = 7) =>
  adminApi.get('/analytics/ga4', { params: { days } });

export const getAnalyticsGsc = (days = 28) =>
  adminApi.get('/analytics/gsc', { params: { days } });

export const getAnalyticsGscHistory = (days = 90) =>
  adminApi.get('/analytics/gsc-history', { params: { days } });

export const getAnalyticsPageviews = (days = 7) =>
  adminApi.get('/analytics/pageviews', { params: { days } });
