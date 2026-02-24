import { HttpClient } from '../http-client';
import {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  User,
} from '../types';

/**
 * Authentication module
 * Handles user registration, login, and token management
 */
export class AuthModule {
  constructor(private http: HttpClient) {}

  /**
   * Register a new user
   * @param request - Registration details
   * @returns User and access token
   */
  async register(request: RegisterRequest): Promise<AuthResponse> {
    const response = await this.http.post<AuthResponse>(
      '/api/v1/auth/register',
      request
    );

    // Store access token for subsequent requests
    this.http.setAccessToken(response.accessToken);

    return response;
  }

  /**
   * Login an existing user
   * @param request - Login credentials
   * @returns User and access token
   */
  async login(request: LoginRequest): Promise<AuthResponse> {
    const response = await this.http.post<AuthResponse>(
      '/api/v1/auth/login',
      request
    );

    // Store access token for subsequent requests
    this.http.setAccessToken(response.accessToken);

    return response;
  }

  /**
   * Logout current user
   * Clears the stored access token
   */
  logout(): void {
    this.http.setAccessToken(undefined);
  }

  /**
   * Get current user information
   * Requires authentication
   */
  async getCurrentUser(): Promise<User> {
    return this.http.get<User>('/api/v1/auth/me', true);
  }

  /**
   * Set access token manually (useful for restoring session)
   * @param token - JWT access token
   */
  setAccessToken(token: string): void {
    this.http.setAccessToken(token);
  }

  /**
   * Get current access token
   * @returns Current JWT token or undefined
   */
  getAccessToken(): string | undefined {
    return this.http.getAccessToken();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.http.getAccessToken();
  }
}
