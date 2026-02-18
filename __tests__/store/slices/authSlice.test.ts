import authReducer, { setUser, clearUser, setLoading } from '@/store/slices/authSlice';
import type { User } from '@/store/slices/authSlice';

describe('authSlice', () => {
  const initialState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
  };

  it('has the correct initial state', () => {
    const state = authReducer(undefined, { type: 'unknown' });
    expect(state).toEqual(initialState);
  });

  describe('setUser', () => {
    it('sets the user and marks as authenticated', () => {
      const user: User = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
      };
      const state = authReducer(initialState, setUser(user));

      expect(state.user).toEqual(user);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('sets user with avatar URL', () => {
      const user: User = {
        id: 'user-2',
        email: 'trader@example.com',
        name: 'Trader',
        avatarUrl: 'https://example.com/avatar.jpg',
      };
      const state = authReducer(initialState, setUser(user));

      expect(state.user?.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('replaces existing user', () => {
      const existingUser: User = {
        id: 'user-1',
        email: 'old@example.com',
        name: 'Old User',
        avatarUrl: null,
      };
      const prevState = {
        user: existingUser,
        isAuthenticated: true,
        isLoading: false,
      };

      const newUser: User = {
        id: 'user-2',
        email: 'new@example.com',
        name: 'New User',
        avatarUrl: null,
      };
      const state = authReducer(prevState, setUser(newUser));

      expect(state.user).toEqual(newUser);
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('clearUser', () => {
    it('resets user to null and isAuthenticated to false', () => {
      const prevState = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test',
          avatarUrl: null,
        },
        isAuthenticated: true,
        isLoading: false,
      };
      const state = authReducer(prevState, clearUser());

      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('is a no-op on initial state except setting isLoading to false', () => {
      const state = authReducer(initialState, clearUser());

      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('setLoading', () => {
    it('sets isLoading to true', () => {
      const prevState = { ...initialState, isLoading: false };
      const state = authReducer(prevState, setLoading(true));
      expect(state.isLoading).toBe(true);
    });

    it('sets isLoading to false', () => {
      const state = authReducer(initialState, setLoading(false));
      expect(state.isLoading).toBe(false);
    });

    it('does not affect other state properties', () => {
      const user: User = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test',
        avatarUrl: null,
      };
      const prevState = {
        user,
        isAuthenticated: true,
        isLoading: false,
      };
      const state = authReducer(prevState, setLoading(true));

      expect(state.user).toEqual(user);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(true);
    });
  });
});
