import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Layout,
    Zap,
    FileText,
    Calculator,
    MessageSquare,
    Download,
    CheckCircle,
    Layers,
    ArrowRight
} from 'lucide-react';
import './LandingPage.css';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    const scrollToFeatures = () => {
        document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="landing-container">
            {/* Navbar */}
            <nav className="lp-nav">
                <div className="lp-logo">SAYANHO WEB</div>
                <div className="lp-nav-links">
                    <span onClick={scrollToFeatures} className="lp-nav-link">Features</span>
                    <button onClick={() => navigate('/design')} className="btn-primary-sm">Launch Designer</button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero">
                <div className="hero-content">
                    <div className="hero-tag">Sayanho V1.2 Now Available</div>
                    <h1>Professional Electrical<br />Panel Design, Reimagined</h1>
                    <p>
                        A powerful, web-based CAD environment for engineers.
                        Design, analyze, and export professional-grade electrical diagrams in minutes.
                    </p>
                    <div className="hero-ctas">
                        <button onClick={() => navigate('/design')} className="btn-primary">Launch Designer</button>
                        <button onClick={scrollToFeatures} className="btn-secondary">Explore Features</button>
                    </div>
                </div>

                <div className="hero-visual">
                    <img src="/assets/landing/hero_workspace.gif" alt="Sayanho Workspace" />
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="features-grid">
                <div className="feature-card">
                    <div className="feature-icon"><Layout size={24} /></div>
                    <h3>Intelligent Library</h3>
                    <p>Extensive set of components—from Distribution Boards to Sockets—organized for quick drag-and-drop access.</p>
                </div>
                <div className="feature-card">
                    <div className="feature-icon"><Zap size={24} /></div>
                    <h3>Auto-Rating Engine</h3>
                    <p>Automatically calculate and update component ratings based on network analysis and IEC compliance logic.</p>
                </div>
                <div className="feature-card">
                    <div className="feature-icon"><Calculator size={24} /></div>
                    <h3>Network Analysis</h3>
                    <p>Built-in tools for Voltage Drop calculations, load balancing, and real-time network validation.</p>
                </div>
                <div className="feature-card">
                    <div className="feature-icon"><FileText size={24} /></div>
                    <h3>Export Ready</h3>
                    <p>Generate high-resolution PNG diagrams or export detailed Bill of Quantities (BOQ) directly to Excel.</p>
                </div>
                <div className="feature-card">
                    <div className="feature-icon"><Layers size={24} /></div>
                    <h3>Multi-Canvas Sheets</h3>
                    <p>Manage complex projects across multiple sheets with a familiar tabbed interface and portal connections.</p>
                </div>
                <div className="feature-card">
                    <div className="feature-icon"><MessageSquare size={24} /></div>
                    <h3>AI Assistant</h3>
                    <p>Use our AI Diagram Assistant to analyze loads, add components, or query your project database via chat.</p>
                </div>
            </section>

            {/* Component Library Section */}
            <section className="detail-section">
                <div className="detail-content">
                    <h2>Vast Component Library</h2>
                    <p>
                        Choose from hundreds of pre-defined electrical components.
                        From HV/LV panels to light points and fans, everything you need
                        is just a drag-and-drop away.
                    </p>
                </div>
                <div className="detail-visual">
                    <img src="/assets/landing/component_library.png" alt="Component Library" />
                </div>
            </section>

            {/* Detailed Section: Auto Rating */}
            <section className="detail-section reverse">
                <div className="detail-visual">
                    <img src="/assets/landing/auto_rating.png" alt="Auto Rating Feature" />
                </div>
                <div className="detail-content">
                    <h2>Smart Rating & Compliance</h2>
                    <p>
                        Our one-click rating engine analyzes your entire network topology.
                        It intelligently selects the appropriate switchgear ratings, cable sizes,
                        and protective devices, ensuring your design meets all specified constraints.
                    </p>
                </div>
            </section>

            {/* Context Menu Section */}
            <section className="detail-section">
                <div className="detail-content">
                    <h2>Advanced Editor Controls</h2>
                    <p>
                        Right-click any item to access advanced controls like rotation,
                        locking, and portal actions. The intuitive context menu makes
                        designing complex panels a breeze.
                    </p>
                </div>
                <div className="detail-visual">
                    <img src="/assets/landing/context_menu.png" alt="Context Menu" />
                </div>
            </section>

            {/* Detailed Section: Voltage Drop */}
            <section className="detail-section reverse">
                <div className="detail-visual">
                    <img src="/assets/landing/voltage_drop.png" alt="Voltage Drop Calculator" />
                </div>
                <div className="detail-content">
                    <h2>Precision Engineering Tools</h2>
                    <p>
                        Calculate voltage drop instantly for Single and 3-Phase networks.
                        Define conductor materials, lengths, and safety margins to verify
                        compliance with your local standards.
                    </p>
                </div>
            </section>

            {/* Settings Section */}
            <section className="detail-section">
                <div className="detail-content">
                    <h2>Fully Customizable</h2>
                    <p>
                        Configure safety margins, diversification factors, and export settings
                        to match your project requirements. Sayanho gives you full control
                        over the underlying calculation logic.
                    </p>
                </div>
                <div className="detail-visual">
                    <img src="/assets/landing/settings.png" alt="Settings Dialog" />
                </div>
            </section>

            {/* Detailed Section: AI Assistant */}
            <section className="detail-section reverse">
                <div className="detail-visual">
                    <img src="/assets/landing/ai_assistant.png" alt="AI Assistant" />
                </div>
                <div className="detail-content">
                    <h2>AI-Powered Design</h2>
                    <p>
                        The AI Diagram Assistant is integrated directly into your workspace.
                        Ask it to rebalance phases, suggest cable sizes, or even add a set of
                        lighting points to a specific DB. It understands your diagram context.
                    </p>
                </div>
            </section>

            {/* How it works */}
            <section className="how-it-works">
                <h2>Streamlined Workflow</h2>
                <div className="steps">
                    <div className="step">
                        <div className="step-num">1</div>
                        <h4>Design</h4>
                        <p>Drag components and connect them logically using cable or busbar specs.</p>
                    </div>
                    <div className="step">
                        <div className="step-num">2</div>
                        <h4>Analyze</h4>
                        <p>Run health checks, calculate voltage drop, and use AI to optimize your layout.</p>
                    </div>
                    <div className="step">
                        <div className="step-num">3</div>
                        <h4>Export</h4>
                        <p>Generate professional Excel estimates and high-res PNGs for your reports.</p>
                    </div>
                </div>
            </section>

            {/* Footer CTA */}
            <section className="footer-cta">
                <h2>Ready to Start Designing?</h2>
                <div className="hero-ctas" style={{ justifyContent: 'center' }}>
                    <button onClick={() => navigate('/design')} className="btn-primary">Launch Sayanho Web</button>
                </div>
                <p style={{ marginTop: '3rem', color: '#4b5563', fontSize: '0.875rem' }}>
                    Sayanho Web v1.2 &copy; {new Date().getFullYear()}. All rights reserved.
                </p>
            </section>
        </div>
    );
};

export default LandingPage;
