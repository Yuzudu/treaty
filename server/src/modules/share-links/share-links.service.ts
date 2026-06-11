import { Injectable } from '@nestjs/common';

@Injectable()
export class ShareLinksService {
  create(_projectId: string) {
    // Generate time-limited token, store share link
    return { token: 'stub-token', expiresAt: new Date().toISOString() };
  }

  findByToken(_token: string) {
    // Look up share link, validate expiry
    return { projectId: 'stub', token: _token };
  }
}
