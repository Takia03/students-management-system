import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// put @Public() on a route to skip the login check
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);