import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../app/chatgpt-auth';
export async function isAdmin(){const u=await getChatGPTUser();return !!u&&!!env.SAVEHALF_ADMIN_EMAIL&&u.email.toLowerCase()===env.SAVEHALF_ADMIN_EMAIL.toLowerCase();}
export function sameOrigin(request:Request){return request.headers.get('Origin')===new URL(request.url).origin;}
