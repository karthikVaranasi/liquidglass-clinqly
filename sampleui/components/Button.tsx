// CHAT BOT COMPONENT COMMENTED OUT
/*
import React, { useState, useEffect, useRef } from 'react';
import {
  Smile,
  Paperclip,
  Send,
  Minus,
  X,
  User2,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';

import ButtonSVG from '../assets/button-icon.svg';
import HeaderBG from '../assets/header-bg.svg';
import HeaderFrame from '../assets/header-frame.svg';
import ChatIcon from '../assets/Glyph.svg';

type Sender = 'bot' | 'user';
interface Msg {
  id: string;
  sender: Sender;
  text: string;
}
interface Opt {
  text: string;
  value: string;
}

const ChatWidget: React.FC<{ onMin: () => void; onClose: () => void }> = ({
  onMin,
  onClose,
}) => {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [opts, setOpts] = useState<Opt[]>([]);
  const [inp, setInp] = useState('');
  const [user, setUser] = useState<Record<string, unknown>>({ state: null });
  const scrollRef = useRef<HTMLDivElement>(null);

  const API = `${import.meta.env.VITE_CHAT_BOT_URL}/chat`;

  const push = (s: Sender, t: string) =>
    setMsgs(prev => {
      const last = prev[prev.length - 1];
      if (last && last.sender === s && last.text === t) return prev;
      return [...prev, { id: crypto.randomUUID(), sender: s, text: t }];
    });

  useEffect(() => {
    send('Hello', false);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [msgs]);

  const send = async (txt: string, echo = true) => {
    if (!txt.trim()) return;
    if (echo) push('user', txt.trim());
    setOpts([]);
    push('bot', 'Typing…');

    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: txt.trim(), user_data: user }),
        signal: AbortSignal.timeout(10000),
      });
      setMsgs(m => m.filter(x => x.text !== 'Typing…'));
      if (!r.ok) throw new Error(String(r.status));
      const data: { response: string; action?: string; data?: any } =
        await r.json();
      push('bot', data.response);
      setUser(data.data ?? {});
      route(data.action, data.data);
    } catch {
      setMsgs(m => m.filter(x => x.text !== 'Typing…'));
      push(
        'bot',
        '⚠️ Cannot connect to the server. Please make sure the backend is running.'
      );
    }
  };

  const route = (a?: string, d?: any) => {
    if (a === 'offer_booking')
      setOpts([
        { text: 'Yes', value: 'Yes' },
        { text: 'No', value: 'No' },
      ]);
    else if (a === 'show_existing_appointment')
      setOpts([
        { text: 'Cancel Appointment', value: 'cancel' },
        { text: 'Book New Appointment', value: 'book' },
      ]);
    else if (a === 'confirm_cancellation')
      setOpts([
        { text: 'Yes, Cancel', value: 'yes' },
        { text: 'No, Keep', value: 'no' },
      ]);
    else if (a === 'show_options' && d?.options)
      setOpts(
        d.options.map((o: any) =>
          typeof o === 'string' ? { text: o, value: o } : o
        )
      );
    else if (a === 'request_department')
      setOpts(
        ['Cardiology', 'Neurology', 'General Physician'].map(x => ({
          text: x,
          value: x,
        }))
      );
    else if (a === 'request_doctor' && d?.doctors)
      setOpts(d.doctors.map((x: string) => ({ text: x, value: x })));
    else if (a === 'request_date' && d?.available_dates)
      setOpts(d.available_dates.map((x: string) => ({ text: x, value: x })));
    else if (a === 'request_time' && d?.available_slots)
      setOpts(d.available_slots.map((x: string) => ({ text: x, value: x })));
    else if (a === 'conversation_end')
      setOpts([{ text: 'Start Over', value: 'Hello' }]);
  };

  const Bubble = ({ m }: { m: Msg }) => {
    const bot = m.sender === 'bot';
    const warning =
      m.text.includes('⚠️') || m.text.toLowerCase().includes('error');
    const bubbleCx = bot
      ? warning
        ? 'bg-yellow-100 border border-yellow-300'
        : 'bg-white shadow-sm'
      : 'border border-teal-600';
    return (
      <div className={`flex ${bot ? '' : 'justify-end'}`}>
        {bot && (
          <div className="mr-3">
            <div className="h-9 w-9 rounded-full bg-yellow-400 flex items-center justify-center">
              <img src={ChatIcon} alt="" className="h-7 w-7" />
            </div>
          </div>
        )}
        <div className={`rounded-lg px-4 py-3 text-[15px] leading-snug ${bubbleCx}`}>
          {m.text}
        </div>
        {!bot && (
          <div className="ml-3 mt-1 h-9 w-9 rounded-full bg-teal-600 flex items-center justify-center text-white">
            <User2 size={20} strokeWidth={2.2} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="flex flex-col rounded-[26px] shadow-2xl overflow-hidden bg-[#F8F9FA]"
      style={{ width: 600, height: 723 }}
    >
      <header className="relative w-full h-[86px] z-10 pointer-events-none">
        <img
          src={HeaderFrame}
          alt="Header Frame"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <img
          src={HeaderBG}
          alt="Header BG"
          className="absolute top-[15px] left-1/2 -translate-x-1/2 w-[552px] h-[55px] object-contain pointer-events-none"
        />
        <div className="absolute right-[24px] top-[26px] z-20 flex gap-4 pointer-events-auto">
          <button title="Minimize" onClick={onMin} className="text-white hover:scale-110 transition-transform">
            <Minus size={20} strokeWidth={2.2} />
          </button>
          <button title="Close" onClick={onClose} className="text-white hover:scale-110 transition-transform">
            <X size={22} strokeWidth={2.2} />
          </button>
        </div>
      </header>

      <main ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {msgs.map(m => (
          <Bubble key={m.id} m={m} />
        ))}
        {opts.length > 0 && (
          <div className="flex flex-col gap-3">
            {opts.map(o => (
              <button
                key={o.value}
                onClick={() => send(o.value)}
                className="self-start rounded-lg border border-teal-600 px-4 py-2 text-teal-700 hover:bg-teal-50"
              >
                {o.text}
              </button>
            ))}
          </div>
        )}
      </main>

      <div className="h-[75px] border-t bg-white flex items-center px-5 gap-3">
        <input
          className="flex-1 h-[37px] rounded-lg border border-gray-300 px-3 text-[15px] placeholder-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          placeholder="Write a message"
          value={inp}
          onChange={e => setInp(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (send(inp), setInp(''))}
        />
        <button className="p-2 text-gray-500 hover:text-teal-600"><Smile size={22} /></button>
        <button className="p-2 text-gray-500 hover:text-teal-600"><Paperclip size={22} /></button>
        <button
          onClick={() => {
            send(inp);
            setInp('');
          }}
          className="rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 p-2 text-white hover:brightness-110"
        >
          <Send size={20} strokeWidth={2.2} />
        </button>
      </div>

      <div className="h-[40px] border-t flex items-center justify-between px-6 bg-[#F5F6F7]">
        <span className="text-sm text-gray-500">Powered by Medical Dashboard</span>
        <div className="flex gap-4 text-gray-500">
          <button className="hover:text-teal-600" title="Like"><ThumbsUp size={20} /></button>
          <button className="hover:text-teal-600" title="Dislike"><ThumbsDown size={20} /></button>
        </div>
      </div>
    </div>
  );
};

const LauncherBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  className = '',
  ...props
}) => (
  <button {...props} className={`w-[132px] h-[101px] ${className}`}>
    <img src={ButtonSVG} alt="Open chat" className="w-full h-full" />
  </button>
);

const ChatWidgetLauncher: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState(false);

  return (
    <>
      {!open && (
        <LauncherBtn
          onClick={() => {
            setOpen(true);
            setMin(false);
          }}
          className="fixed bottom-6 right-6 z-50"
        />
      )}
      {open && min && (
        <LauncherBtn
          onClick={() => setMin(false)}
          className="fixed bottom-6 right-6 z-50"
        />
      )}
      {open && !min && (
        <div className="fixed bottom-6 right-6 z-50">
          <ChatWidget onClose={() => setOpen(false)} onMin={() => setMin(true)} />
        </div>
      )}
    </>
  );
};

export default ChatWidgetLauncher;
*/

// Placeholder component to prevent import errors
const ChatWidgetLauncher: React.FC = () => {
  return null;
};

export default ChatWidgetLauncher;
