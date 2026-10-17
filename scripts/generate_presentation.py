import os
import pptx
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

def create_deck():
    prs = pptx.Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    C_PRIMARY = RGBColor(7, 29, 54)        # Deep Navy
    C_ACCENT = RGBColor(0, 120, 212)       # Azure Blue
    C_CYAN = RGBColor(0, 194, 255)         # Cyan
    C_LIGHT_BG = RGBColor(248, 250, 252)   # Off-white
    C_CARD_BG = RGBColor(255, 255, 255)    # White
    C_BORDER = RGBColor(203, 213, 225)     # Slate 300
    C_TEXT_MAIN = RGBColor(15, 23, 42)     # Slate 900
    C_TEXT_MUTED = RGBColor(100, 116, 139) # Slate 500

    slides_data = [
        {
            'title': 'CLOUD-223: Application Platform Abstraction Over Heterogeneous Cloud Infrastructure',
            'subtitle': 'SAMYAK-2026 Capstone Project Presentation & Review',
            'content': [
                'Project Code: C2C-94 / CLOUD-223 | Class: Y23 CSE-2 | Team: P-16 | Semester: S-4',
                'Department of Computer Science & Engineering, KL University',
                'Team Lead: Shaik Mohammed Sameer (2300030621) - Platform Abstraction & DevOps Lead',
                'Team Members: Pravallika Gubba (2300033432), Jeethu Kumar Ganchi (2300031651), Khammapati Ganesh (2300033359)',
                'Faculty Guide: Dr. N. Raghavendra Sai'
            ]
        },
        {
            'title': 'Problem Statement: The "Portability Illusion"',
            'subtitle': 'Why Conventional Multi-Cloud Deployments Break in Production',
            'content': [
                'The Flawed Industry Assumption: Deploy(AWS) = OK and Deploy(Azure) = OK implies Application is Portable.',
                'The Core Triad: Deployment Portability != Behavioral Portability != Recovery Portability.',
                'Abstraction Leakage: Underlying hypervisors, disk IOPS ceilings, and network packet encapsulation bleed through containers.',
                'Behavioral Drift: Identical Docker images experience measurable divergence in p95 latency, cold start, and CPU throttling.',
                'Scientific Goal: Replace the unverified assumption of portability with empirical, measured validation.'
            ]
        },
        {
            'title': 'Existing Approaches & Research Gap Analysis',
            'subtitle': 'Where Terraform, Kubernetes, and Cloud PaaS Fall Short',
            'content': [
                'Terraform & IaC: Provisions infrastructure; job ends once resources exist. Does NOT measure runtime parity.',
                'Kubernetes Alone: Harmonizes container scheduling API, but does NOT isolate underlying hardware variances.',
                'Cloud PaaS (Cloud Foundry / Heroku): Focuses on developer workflow (cf push), but assumes provider behavior.',
                'Research Gap: No existing framework empirically measures runtime behavioral drift, executes chaos, and cryptographically proves recovery across AWS, Azure, and GCP.'
            ]
        },
        {
            'title': 'Project Objectives & Target Deliverables',
            'subtitle': 'Five Primary Engineering & Research Goals',
            'content': [
                '1. Universal Cloud Provider Abstraction: IDeploymentProvider interface with AWS, Azure, and GCP adapters.',
                '2. Empirical Difference Engine: infraDiffEngine analyzing 10 dimensions (Storage, Latency, Cold Start, CPU, Memory).',
                '3. Controlled Chaos Testing: chaosEngine executing 5 injected failure vectors.',
                '4. Automated Recovery Evaluator: recoveryEngine measuring Mean Time to Detect (MTTD) and Recover (MTTR).',
                '5. Cryptographic Evidence Ledger: SHA-256 sealed audit manifests (evidence/manifest.json).'
            ]
        },
        {
            'title': 'System Architecture & Technical Design',
            'subtitle': 'Layered Decoupled Architecture with Factory + Adapter Pattern',
            'content': [
                'Presentation Layer: React 19, TypeScript, Vite, Recharts, Lucide Icons, and Glassmorphism dashboards.',
                'API & Real-Time Gateway: Node.js, Express.js, Socket.IO / WebSockets for live deployment step progression.',
                'Abstraction Engine: ProviderFactory dynamically dispatching IDeploymentProvider implementations.',
                'Target Heterogeneous IaaS: Amazon EKS (gp3), Azure AKS (Premium SSD v2), Google GKE Autopilot (Balanced PD).',
                'Observability & Evidence: OpenTelemetry SDK, Prometheus metrics scrapers, and SHA-256 evidenceWriter.'
            ]
        },
        {
            'title': 'Major Engineering Modules (12 Core Capabilities)',
            'subtitle': 'Comprehensive Platform Feature Set',
            'content': [
                '1. Executive Multi-Cloud Dashboard (Global health, cluster metrics, aggregate parity index)',
                '2. Application Catalog & Universal Spec Builder (Image, ports, replicas, limits, target clouds)',
                '3. 13-Step Deployment Pipeline Engine (Pre-deployment checks, manifest generation, rollback safety)',
                '4. Infrastructure Difference Engine (Storage, network, cold-start, CPU, and memory leakage)',
                '5. Native Chaos Studio (Pod kill, network latency, memory pressure, storage throttle, cold-start flush)',
                '6. Automated Self-Healing & Recovery Evaluator (Health probe polling at 100ms intervals)'
            ]
        },
        {
            'title': 'Demonstration Workflow (End-to-End)',
            'subtitle': 'From Universal Spec Definition to Cryptographic Evidence Dossier',
            'content': [
                'Step 1: Authenticate with Zero-Trust RBAC role (SuperAdmin, DevOps, Viewer).',
                'Step 2: Select application (enterprise-checkout-api:v2.4.1) and select target clouds [x] AWS [x] Azure [x] GCP.',
                'Step 3: Trigger deployment and view real-time WebSocket step streaming (0% -> 100%).',
                'Step 4: Navigate to Infra Parity Hub and inspect empirical latency and IOPS leakage.',
                'Step 5: Inject chaos pod kill into Azure AKS; watch automated recovery in 2.4 seconds.',
                'Step 6: Inspect immutable SHA-256 manifest file with verified cryptographic checksum.'
            ]
        },
        {
            'title': 'Experimental Findings & Gate G0 Verification',
            'subtitle': 'Empirical Evidence Proving the Research Hypothesis',
            'content': [
                'Leakage Points Identified: 3 (Storage IOPS: -27.1% on Azure; Latency: +32.3% on Azure; Cold Start: +61.9% on Azure).',
                'Variance Categories Quantified: 5 Signals (Latency, Startup, Memory, CPU, Storage throughput).',
                'Static-Seed Repeatability Standard Deviation: 0.0 (Deterministic benchmark consistency across 3 trials).',
                'Chaos Recovery Rate: 100% (5 out of 5 scenarios recovered) with MTTR < 2.8s.',
                'Behavioral Parity Score: 33.33% across 3 multi-cloud batches (Proves abstraction leakage under +-10% bounds).'
            ]
        },
        {
            'title': 'Negative Test Suite Verification (NT-1 to NT-5)',
            'subtitle': 'Rigorous Verification Against False Positives & Edge Cases',
            'content': [
                'NT-1 (Storage & Network Leakage Detection): Flagged IOPS and latency deltas. [PASSED]',
                'NT-2 (Behavioral Variance Underneath): Non-zero telemetry variance confirmed across providers. [PASSED]',
                'NT-3 (False-Positive Prevention): Invalid providers and sandboxes safely rejected without fake success. [PASSED]',
                'NT-4 (Partial Failure State Consistency): Partial cloud outages handled without database corruption. [PASSED]',
                'NT-5 (Retry & Concurrency Idempotency): Concurrent submissions rejected duplicate resource allocations. [PASSED]'
            ]
        },
        {
            'title': 'Conclusion, Future Scope & Acknowledgements',
            'subtitle': 'Transforming Multi-Cloud Portability into an Empirical Science',
            'content': [
                'Key Takeaway: Successful deployment does NOT guarantee runtime parity; CLOUD-223 measures and proves the difference.',
                'Future Scope 1: AI-Driven predictive drift forecasting using LSTM neural networks on OpenTelemetry streams.',
                'Future Scope 2: Intelligent workload brokering routing traffic dynamically based on spot pricing and latency.',
                'Future Scope 3: Automated cross-cloud live state and volume migration during sustained hyperscaler outages.',
                'Acknowledgements: Sincere gratitude to Dr. N. Raghavendra Sai and CSE Faculty at KL University.'
            ]
        }
    ]

    for idx, data in enumerate(slides_data):
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        
        # Background
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = C_LIGHT_BG
        bg.line.fill.background()
        
        # Top Header Bar
        top_bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(1.15))
        top_bar.fill.solid()
        top_bar.fill.fore_color.rgb = C_PRIMARY
        top_bar.line.fill.background()
        
        # Header Text
        txBox = slide.shapes.add_textbox(Inches(0.8), Inches(0.12), Inches(11.7), Inches(0.6))
        tf = txBox.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = data['title']
        p.font.name = 'Segoe UI'
        p.font.size = Pt(20)
        p.font.bold = True
        p.font.color.rgb = RGBColor(255, 255, 255)
        
        p2 = tf.add_paragraph()
        p2.text = data['subtitle']
        p2.font.name = 'Segoe UI'
        p2.font.size = Pt(12)
        p2.font.color.rgb = C_CYAN
        
        # Main Card Shape
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.45), Inches(11.7), Inches(5.3))
        card.fill.solid()
        card.fill.fore_color.rgb = C_CARD_BG
        card.line.color.rgb = C_BORDER
        card.line.width = Pt(1.5)
        
        c_box = slide.shapes.add_textbox(Inches(1.1), Inches(1.7), Inches(11.1), Inches(4.8))
        c_tf = c_box.text_frame
        c_tf.word_wrap = True
        
        for i, line in enumerate(data['content']):
            cp = c_tf.paragraphs[0] if i == 0 else c_tf.add_paragraph()
            cp.text = f'•  {line}'
            cp.font.name = 'Segoe UI'
            cp.font.size = Pt(14)
            cp.font.color.rgb = C_TEXT_MAIN
            cp.space_after = Pt(14)

        # Footer
        ftBox = slide.shapes.add_textbox(Inches(0.8), Inches(6.9), Inches(11.7), Inches(0.4))
        ft = ftBox.text_frame
        fp = ft.paragraphs[0]
        fp.text = f'CLOUD-223 / C2C-94 | KL University CSE | SAMYAK-2026 Presentation | Slide {idx+1} of 10'
        fp.font.name = 'Segoe UI'
        fp.font.size = Pt(10)
        fp.font.color.rgb = C_TEXT_MUTED

    output_path = 'docs/presentation/SAMYAK_2026_EXPO_PRESENTATION.pptx'
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    prs.save(output_path)
    print(f'Successfully generated: {output_path}')

if __name__ == '__main__':
    create_deck()
