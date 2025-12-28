import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export const googleCalendarService = {
  isConfigured: () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),

  // OAuth
  getAuthUrl() {
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ],
      prompt: 'consent'
    });
  },

  async getTokens(code) {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  },

  setCredentials(tokens) {
    oauth2Client.setCredentials(tokens);
  },

  async refreshAccessToken(refreshToken) {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
  },

  // Calendar Operations
  async listCalendars(tokens) {
    this.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const response = await calendar.calendarList.list();
    return response.data.items;
  },

  async createEvent(tokens, calendarId, eventData) {
    this.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const event = {
      summary: eventData.title,
      description: eventData.description,
      start: {
        dateTime: eventData.startTime,
        timeZone: eventData.timezone || 'America/Sao_Paulo'
      },
      end: {
        dateTime: eventData.endTime,
        timeZone: eventData.timezone || 'America/Sao_Paulo'
      },
      attendees: eventData.attendees?.map(email => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 }
        ]
      },
      conferenceData: eventData.createMeeting ? {
        createRequest: { requestId: `nexus-${Date.now()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } }
      } : undefined
    };

    const response = await calendar.events.insert({
      calendarId: calendarId || 'primary',
      resource: event,
      conferenceDataVersion: eventData.createMeeting ? 1 : 0,
      sendUpdates: 'all'
    });

    return {
      eventId: response.data.id,
      htmlLink: response.data.htmlLink,
      meetingLink: response.data.conferenceData?.entryPoints?.[0]?.uri
    };
  },

  async updateEvent(tokens, calendarId, eventId, eventData) {
    this.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const event = {
      summary: eventData.title,
      description: eventData.description,
      start: { dateTime: eventData.startTime, timeZone: eventData.timezone || 'America/Sao_Paulo' },
      end: { dateTime: eventData.endTime, timeZone: eventData.timezone || 'America/Sao_Paulo' }
    };

    const response = await calendar.events.patch({
      calendarId: calendarId || 'primary',
      eventId,
      resource: event,
      sendUpdates: 'all'
    });

    return response.data;
  },

  async deleteEvent(tokens, calendarId, eventId) {
    this.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({
      calendarId: calendarId || 'primary',
      eventId,
      sendUpdates: 'all'
    });

    return true;
  },

  async getEvents(tokens, calendarId, timeMin, timeMax) {
    this.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const response = await calendar.events.list({
      calendarId: calendarId || 'primary',
      timeMin: timeMin || new Date().toISOString(),
      timeMax,
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime'
    });

    return response.data.items;
  },

  async getFreeBusy(tokens, calendarId, timeMin, timeMax) {
    this.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        items: [{ id: calendarId || 'primary' }]
      }
    });

    return response.data.calendars[calendarId || 'primary'].busy;
  },

  // Sync helper
  async syncClassToCalendar(tokens, calendarId, classData) {
    const eventData = {
      title: `Aula: ${classData.title} - ${classData.studentName}`,
      description: `Matéria: ${classData.subject}\nAluno: ${classData.studentName}\nNotas: ${classData.notes || ''}`,
      startTime: classData.scheduledAt,
      endTime: new Date(new Date(classData.scheduledAt).getTime() + classData.duration * 60000).toISOString(),
      createMeeting: classData.meetingProvider === 'meet'
    };

    if (classData.googleEventId) {
      return await this.updateEvent(tokens, calendarId, classData.googleEventId, eventData);
    } else {
      return await this.createEvent(tokens, calendarId, eventData);
    }
  }
};

export default googleCalendarService;
