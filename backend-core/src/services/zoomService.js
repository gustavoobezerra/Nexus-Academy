import axios from 'axios';

const ZOOM_API_URL = 'https://api.zoom.us/v2';

export const zoomService = {
  isConfigured: () => !!(process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET),

  // OAuth
  getAuthUrl(redirectUri, state) {
    const clientId = process.env.ZOOM_CLIENT_ID;
    return `https://zoom.us/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  },

  async getAccessToken(code, redirectUri) {
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;

    const response = await axios.post('https://zoom.us/oauth/token', null, {
      params: { grant_type: 'authorization_code', code, redirect_uri: redirectUri },
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data;
  },

  async refreshAccessToken(refreshToken) {
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;

    const response = await axios.post('https://zoom.us/oauth/token', null, {
      params: { grant_type: 'refresh_token', refresh_token: refreshToken },
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data;
  },

  // Meetings
  async createMeeting(accessToken, data) {
    if (!this.isConfigured() || !accessToken) {
      // DEBUG: console.log('[Zoom Mock] Creating meeting:', data.topic);
      return {
        mock: true,
        id: `mock_${Date.now()}`,
        join_url: `https://zoom.us/j/mock${Date.now()}`,
        start_url: `https://zoom.us/s/mock${Date.now()}`,
        password: 'mock123'
      };
    }

    const response = await axios.post(`${ZOOM_API_URL}/users/me/meetings`, {
      topic: data.topic,
      type: 2, // Scheduled meeting
      start_time: data.startTime,
      duration: data.duration,
      timezone: data.timezone || 'America/Sao_Paulo',
      password: data.password,
      agenda: data.agenda,
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: true,
        mute_upon_entry: false,
        waiting_room: false,
        audio: 'both',
        auto_recording: data.autoRecord ? 'cloud' : 'none'
      }
    }, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    });

    return response.data;
  },

  async getMeeting(accessToken, meetingId) {
    if (!this.isConfigured() || !accessToken) return null;

    const response = await axios.get(`${ZOOM_API_URL}/meetings/${meetingId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return response.data;
  },

  async updateMeeting(accessToken, meetingId, data) {
    if (!this.isConfigured() || !accessToken) return { mock: true };

    const response = await axios.patch(`${ZOOM_API_URL}/meetings/${meetingId}`, data, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    });

    return response.data;
  },

  async deleteMeeting(accessToken, meetingId) {
    if (!this.isConfigured() || !accessToken) return true;

    await axios.delete(`${ZOOM_API_URL}/meetings/${meetingId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return true;
  },

  async endMeeting(accessToken, meetingId) {
    if (!this.isConfigured() || !accessToken) return true;

    await axios.put(`${ZOOM_API_URL}/meetings/${meetingId}/status`, { action: 'end' }, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    });

    return true;
  },

  // Recordings
  async getRecordings(accessToken, meetingId) {
    if (!this.isConfigured() || !accessToken) return [];

    const response = await axios.get(`${ZOOM_API_URL}/meetings/${meetingId}/recordings`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return response.data.recording_files || [];
  },

  async deleteRecordings(accessToken, meetingId) {
    if (!this.isConfigured() || !accessToken) return true;

    await axios.delete(`${ZOOM_API_URL}/meetings/${meetingId}/recordings`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return true;
  },

  // User info
  async getUser(accessToken) {
    if (!this.isConfigured() || !accessToken) return null;

    const response = await axios.get(`${ZOOM_API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    return response.data;
  },

  // Helper for class scheduling
  async createClassMeeting(accessToken, classData) {
    return await this.createMeeting(accessToken, {
      topic: `${classData.title} - ${classData.studentName}`,
      startTime: classData.scheduledAt,
      duration: classData.duration,
      agenda: `Aula de ${classData.subject}\nAluno: ${classData.studentName}`,
      autoRecord: classData.autoRecord || false
    });
  },

  // Webhook processing
  processWebhook(event, payload) {
    switch (event) {
      case 'meeting.started':
        return { type: 'started', meetingId: payload.object.id, startTime: payload.object.start_time };
      case 'meeting.ended':
        return { type: 'ended', meetingId: payload.object.id, endTime: new Date() };
      case 'recording.completed':
        return { type: 'recording', meetingId: payload.object.id, files: payload.object.recording_files };
      case 'meeting.participant_joined':
        return { type: 'joined', meetingId: payload.object.id, participant: payload.object.participant };
      case 'meeting.participant_left':
        return { type: 'left', meetingId: payload.object.id, participant: payload.object.participant };
      default:
        return null;
    }
  }
};

export default zoomService;
