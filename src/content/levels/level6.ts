import type { LevelMeta } from '../types.ts';

export const level6: LevelMeta = {
  id: 'level-6',
  number: 6,
  title: 'Applications',
  summary:
    'Learn how everyday services work, from turning a web address into an IP address to loading a page, sending email and moving files.',
  lessons: [
    {
      id: 'l6-dns',
      levelId: 'level-6',
      title: 'DNS lookup',
      summary:
        'Follow a name like example.com as it is turned into an IP address by servers that each know part of the answer.',
      minutes: 18,
      built: false,
      labIds: [],
    },
    {
      id: 'l6-http',
      levelId: 'level-6',
      title: 'HTTP/1.1, 2, 3',
      summary:
        'See how a browser asks a server for a page, and how HTTP/2 and HTTP/3 load pages faster by sharing one connection between many requests.',
      minutes: 20,
      built: false,
      labIds: [],
    },
    {
      id: 'l6-email',
      levelId: 'level-6',
      title: 'Email (SMTP/IMAP/POP3)',
      summary:
        "Follow an email from your outbox to a friend's inbox, and see which protocol sends it and which ones let you read it.",
      minutes: 18,
      built: false,
      labIds: [],
    },
    {
      id: 'l6-ftp-ssh',
      levelId: 'level-6',
      title: 'FTP and SSH',
      summary:
        'Learn how FTP moves files, why it sends everything as plain text, and how SSH lets you control another computer over a protected connection.',
      minutes: 16,
      built: false,
      labIds: [],
    },
    {
      id: 'l6-proxies',
      levelId: 'level-6',
      title: 'Proxies',
      summary:
        'See how a proxy sits between you and a website, and how it can filter requests, keep copies of pages, or hide your address.',
      minutes: 14,
      built: false,
      labIds: [],
    },
    {
      id: 'l6-cdn-load-balancers',
      levelId: 'level-6',
      title: 'CDNs and load balancers',
      summary:
        'Learn how websites serve millions of people by keeping copies of content close to you and sharing requests across many servers.',
      minutes: 16,
      built: false,
      labIds: [],
    },
  ],
};
