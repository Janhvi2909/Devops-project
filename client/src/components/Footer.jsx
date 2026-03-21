import React from 'react';

export default function Footer() {
  return (
    <footer className="footer" id="app-footer">
      <p>
        Built with <span className="footer__heart">❤️</span> using React + Express + Prisma
      </p>
      <p style={{ marginTop: '4px' }}>TaskFlow © {new Date().getFullYear()}</p>
    </footer>
  );
}
