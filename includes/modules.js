// Alpine toolkits - deployable module store
// Each module is an install script run inside Alpine proot
module.exports = {
    'network-scan': {
        name: 'Network Scanning',
        icon: 'crosshairs',
        description: 'nmap, netcat, socat for port scanning and pivoting',
        install: 'apk add --no-cache nmap netcat-openbsd socat 2>&1 | tail -3'
    },
    'recon': {
        name: 'Recon Toolkit',
        icon: 'search',
        description: 'curl, wget, dnsutils, whois, traceroute for OSINT/recon',
        install: 'apk add --no-cache curl wget bind-tools whois traceroute 2>&1 | tail -3'
    },
    'reverse-ssh': {
        name: 'Reverse SSH',
        icon: 'terminal',
        description: 'openssh, socat for reverse shells and SSH tunneling',
        install: 'apk add --no-cache openssh socat 2>&1 | tail -3 && ssh-keygen -A 2>/dev/null; echo DONE'
    },
    'wifi': {
        name: 'WiFi Tools',
        icon: 'wifi',
        description: 'wireless-tools, iw for WiFi enumeration',
        install: 'apk add --no-cache wireless-tools iw 2>&1 | tail -3'
    },
    'exploit-dev': {
        name: 'Dev & Exploit',
        icon: 'code',
        description: 'python3, gcc, make, git for compiling exploits',
        install: 'apk add --no-cache python3 gcc musl-dev make git 2>&1 | tail -3'
    },
    'proxychains': {
        name: 'Proxychains Pivot',
        icon: 'random',
        description: 'proxychains-ng + nmap for lateral movement through device',
        install: 'apk add --no-cache proxychains-ng nmap 2>&1 | tail -3 && echo "socks4 127.0.0.1 9050" > /etc/proxychains.conf; echo DONE'
    }
};
