import { createClient } from 'npm:@supabase/supabase-js@2.78.0';
import { createReceiptHandler, ReceiptError } from './core.js';

const travelUrl = 'https://wphdhiowhivefokivfql.supabase.co';
const publicKey = 'sb_publishable_WtJZIOmD4Q6gSihH0xm2rw_ru_yf4Cy';
const auth = {persistSession:false, autoRefreshToken:false};
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default, {auth});

Deno.serve(createReceiptHandler({
  apiKey:Deno.env.get('OPENAI_API_KEY') || '',
  async authenticate(req: Request) {
    const header = req.headers.get('authorization') || '';
    if (!/^Bearer \S+$/.test(header)) throw new ReceiptError(401,'여행 사이트에 로그인해 주세요.');
    const client = createClient(travelUrl,publicKey,{auth,global:{headers:{Authorization:header}}});
    const {data,error} = await client.auth.getUser(header.slice(7));
    if (error || !data.user) throw new ReceiptError(401,'여행 사이트에 다시 로그인해 주세요.');
    const profile = await client.from('travel_members').select('user_id').eq('user_id',data.user.id).maybeSingle();
    if (profile.error || !profile.data) throw new ReceiptError(403,'여행 멤버만 사용할 수 있어요.');
    return data.user;
  },
  async reserve(userId:string,requestId:string) {
    const {data,error} = await admin.rpc('reserve_travel_receipt',{p_user_id:userId,p_request_id:requestId});
    if (error) throw new ReceiptError(503,'인식 한도를 확인할 수 없어요.');
    if (!data) throw new ReceiptError(429,'이미 처리한 요청이거나 여행 영수증 인식 한도에 도달했어요.');
  }
}));
