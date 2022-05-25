import { JwtPayload } from "jsonwebtoken";
import { RequestUser } from "src/core/request-context";
import { JwtService } from "src/jwt/jwt.service";
import { User } from "src/user/user.entity";

export class AuthTokenService {
  constructor(private jwtService: JwtService) {}

  async signRefresh(user: User): Promise<string> {
    const { id, name, email } = user;
    return this.jwtService.sign<AuthTokenPayload>(
      { user: { id, name, email }, type: "refresh" },
      { expiresIn: "60 days" },
    );
  }

  async signAccess(refreshToken: string): Promise<string> {
    const { user } = await this.decodeAndVerify(refreshToken);
    return this.jwtService.sign<AuthTokenPayload>(
      { user, type: "access" },
      { expiresIn: "60 minutes" },
    );
  }

  async decodeAndVerify(token: string): Promise<AuthTokenPayload> {
    return this.jwtService.decodeAndVerify<AuthTokenPayload>(token);
  }
}

export interface AuthTokenPayload extends JwtPayload {
  user: RequestUser;
  type: "access" | "refresh";
}
