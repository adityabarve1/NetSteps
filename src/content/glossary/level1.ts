import type { Glossary } from '../types';

// Level 1 terms. Each Level 1 lesson task adds its own, under a kebab-case id,
// for example:
//   packet: { term: 'packet', definition: 'A small piece of a message ...' },
// Definition: one or two short sentences, no undefined jargon. Reuse an id that
// already exists instead of adding a second entry for the same word.
export const level1: Glossary = {
  // Lesson 1.1 What is a network
  network: {
    term: 'network',
    definition:
      'Two or more devices connected by links so they can exchange data.',
  },
  link: {
    term: 'link',
    definition:
      'The connection that carries data between two devices: a cable, or a radio signal such as Wi-Fi.',
  },
  node: {
    term: 'node',
    definition:
      'Any device connected to a network, drawn as a dot or a small picture in a network diagram.',
  },
  protocol: {
    term: 'protocol',
    definition:
      'An agreed set of rules for how devices build, send and understand messages.',
  },
  internet: {
    term: 'internet',
    definition:
      'The worldwide network of networks that links billions of devices. Many different organisations run its parts.',
  },
  'wi-fi': {
    term: 'Wi-Fi',
    definition:
      'The most common kind of wireless link for homes and offices. It carries data by radio between a device and an access point.',
  },
  'network-adapter': {
    term: 'network adapter',
    definition:
      'The part of a device that sends and receives signals on a link, such as its cable socket or its Wi-Fi radio. Also called a network interface.',
  },
  ethernet: {
    term: 'Ethernet',
    definition:
      'The most common standard for wired networks: the cables, the sockets and the rules for sending data over them.',
  },
  switch: {
    term: 'switch',
    definition:
      'A network device with many sockets that joins the devices of one local network and passes each message toward the device it is for.',
  },
  router: {
    term: 'router',
    definition:
      'A network device that joins different networks and passes messages from one network toward the next.',
  },
  host: {
    term: 'host',
    definition:
      'A device that sends and receives its own data on a network, such as a laptop, phone, printer or server. Also called an end device.',
  },
  'network-device': {
    term: 'network device',
    definition:
      'A device whose job is to move other devices’ data along, such as a switch, a router or a Wi-Fi access point.',
  },
  server: {
    term: 'server',
    definition:
      'A computer that provides a service, such as web pages, files or video, to other devices that ask for it.',
  },
  'access-point': {
    term: 'access point',
    definition:
      'A network device that lets wireless devices join a network over Wi-Fi. Most home router boxes have one built in.',
  },
  modem: {
    term: 'modem',
    definition:
      'A device that turns the signal on your internet provider’s line (phone, cable or fibre) into data for your network, and back again.',
  },
  'ip-address': {
    term: 'IP address',
    definition:
      'A number that identifies a device on a network so messages can find it, such as 192.168.1.10.',
  },
  'subnet-mask': {
    term: 'subnet mask',
    definition:
      'A number such as 255.255.255.0 that says which part of an IP address names the network and which part names the device.',
  },
  subnet: {
    term: 'subnet',
    definition:
      'A group of devices whose IP addresses share the same network part, so they can reach each other without a router.',
  },
  web: {
    term: 'the web',
    definition:
      'The pages and sites you open in a web browser. It is one service that runs over the internet, not the internet itself.',
  },
  ping: {
    term: 'ping',
    definition:
      'A command that sends a small test message to an address and reports whether a reply came back and how long it took.',
  },
  'loopback-address': {
    term: 'loopback address',
    definition:
      'The address 127.0.0.1, which a computer uses to send a message to itself. The message never leaves the computer.',
  },
  packet: {
    term: 'packet',
    definition:
      'A small piece of data with the sender’s and receiver’s addresses on it. Large messages travel as many packets.',
  },
};
