import React from 'react';

export default function Header() {
  return (
    <header className="header" id="app-header">
      <div className="header__brand">
        <div className="header__logo">T</div>
        <div>
          <h1 className="header__title">TaskFlow</h1>
          <p className="header__subtitle">Smart Task Manager</p>
        </div>
      </div>
    </header>
  );
}
