import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserMapping {
  principal: string;
  username?: string;
  fullName?: string;
  role?: string;
  lastSeen?: number;
}

interface UserMappingState {
  userMappings: Record<string, UserMapping>;
  
  // Methods
  addOrUpdateUser: (principal: string, data: Partial<UserMapping>) => void;
  getUserByPrincipal: (principal: string) => UserMapping | undefined;
  getDisplayName: (principal: string) => string;
  searchUsers: (query: string) => UserMapping[];
  getAllUsers: () => UserMapping[];
}

const useUserMappingStore = create<UserMappingState>()(
  persist(
    (set, get) => ({
      userMappings: {},

      addOrUpdateUser: (principal: string, data: Partial<UserMapping>) => {
        set((state) => ({
          userMappings: {
            ...state.userMappings,
            [principal]: {
              ...state.userMappings[principal],
              principal,
              ...data,
              lastSeen: Date.now(),
            },
          },
        }));
      },

      getUserByPrincipal: (principal: string) => {
        const { userMappings } = get();
        return userMappings[principal];
      },

      getDisplayName: (principal: string) => {
        const user = get().getUserByPrincipal(principal);
        
        if (user?.username) {
          return user.username;
        }
        
        if (user?.fullName) {
          return user.fullName;
        }
        
        // Return shortened principal as fallback
        return `${principal.slice(0, 8)}...${principal.slice(-4)}`;
      },

      searchUsers: (query: string) => {
        const { userMappings } = get();
        const lowerQuery = query.toLowerCase();
        
        return Object.values(userMappings).filter(user => 
          user.username?.toLowerCase().includes(lowerQuery) ||
          user.fullName?.toLowerCase().includes(lowerQuery) ||
          user.principal.toLowerCase().includes(lowerQuery)
        );
      },

      getAllUsers: () => {
        const { userMappings } = get();
        return Object.values(userMappings).sort((a, b) => 
          (b.lastSeen || 0) - (a.lastSeen || 0)
        );
      },
    }),
    {
      name: 'user-mappings',
      version: 1,
    }
  )
);

export default useUserMappingStore;
