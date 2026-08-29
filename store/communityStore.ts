import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CommunityState {
  // Stream Chat
  currentStreamUser: any | null;
  streamChannels: any[];
  currentStreamChannel: any | null;
  streamMessages: any[];
  
  // Community Features
  communityReports: any[];
  communityModerators: any[];
  communityRules: string[];
  communityStats: {
    totalUsers: number;
    totalMessages: number;
    totalChannels: number;
    activeUsers: number;
  };
  
  // Actions
  setCurrentStreamUser: (user: any) => void;
  setStreamChannels: (channels: any[]) => void;
  setCurrentStreamChannel: (channel: any) => void;
  addStreamMessage: (message: any) => void;
  setStreamMessages: (messages: any[]) => void;
  addCommunityReport: (report: any) => void;
  setCommunityModerators: (moderators: any[]) => void;
  setCommunityRules: (rules: string[]) => void;
  updateCommunityStats: (stats: Partial<CommunityState['communityStats']>) => void;
  resetCommunity: () => void;
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  // Stream Chat
  currentStreamUser: {
    id: 'user_1',
    name: 'Mieszkaniec',
    avatar: null,
    isOnline: true,
  },
  streamChannels: [
    {
      id: 'general',
      name: 'Ogólny',
      description: 'Ogólne rozmowy mieszkańców',
      memberCount: 1250,
      isActive: true,
    },
    {
      id: 'traffic',
      name: 'Ruch drogowy',
      description: 'Informacje o korkach i wypadkach',
      memberCount: 890,
      isActive: true,
    },
    {
      id: 'events',
      name: 'Wydarzenia',
      description: 'Wydarzenia kulturalne i sportowe',
      memberCount: 650,
      isActive: true,
    },
    {
      id: 'help',
      name: 'Pomoc',
      description: 'Wzajemna pomoc mieszkańców',
      memberCount: 320,
      isActive: true,
    },
  ],
  currentStreamChannel: null,
  streamMessages: [],
  
  // Community Features
  communityReports: [],
  communityModerators: [],
  communityRules: [],
  communityStats: {
    totalUsers: 0,
    totalMessages: 0,
    totalChannels: 0,
    activeUsers: 0,
  },
  
  // Actions
  setCurrentStreamUser: (user) => set({ currentStreamUser: user }),
  setStreamChannels: (channels) => set({ streamChannels: channels }),
  setCurrentStreamChannel: (channel) => set({ currentStreamChannel: channel }),
  addStreamMessage: (message) => {
    const { streamMessages } = get();
    set({ streamMessages: [...streamMessages, message] });
  },
  setStreamMessages: (messages) => set({ streamMessages: messages }),
  addCommunityReport: (report) => {
    const { communityReports } = get();
    set({ communityReports: [...communityReports, report] });
  },
  setCommunityModerators: (moderators) => set({ communityModerators: moderators }),
  setCommunityRules: (rules) => set({ communityRules: rules }),
  updateCommunityStats: (stats) => set(state => ({
    communityStats: { ...state.communityStats, ...stats }
  })),
  resetCommunity: () => set({
    communityReports: [],
    communityModerators: [],
    communityRules: [],
    communityStats: {
      totalUsers: 0,
      totalMessages: 0,
      totalChannels: 0,
      activeUsers: 0,
    },
  }),
}));
