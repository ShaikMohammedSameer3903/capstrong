import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# --- COLOR PALETTE (EXACT SPECIFICATION) ---
BG_DARK = RGBColor(7, 29, 54)        # #071D36 Dark Navy
PRIMARY_BLUE = RGBColor(0, 120, 212) # #0078D4 Azure Blue
ROYAL_BLUE = RGBColor(37, 99, 235)  # #2563EB Royal Blue
CYAN_ACCENT = RGBColor(0, 194, 255) # #00C2FF Cyan Accent
PURPLE_ACCENT = RGBColor(124, 58, 237) # #7C3AED Purple Accent
GREEN_SUCCESS = RGBColor(22, 199, 132) # #16C784 Success Green
WARNING_ORANGE = RGBColor(245, 158, 11) # #F59E0B Warning Orange

CARD_BG = RGBColor(13, 35, 62)       # #0D233E Glass Card Fill
CARD_BORDER = RGBColor(30, 73, 118)  # #1E4976 Card Border
CARD_BG_ALT = RGBColor(15, 45, 78)   # #0F2D4E Card Alt Fill

TEXT_WHITE = RGBColor(255, 255, 255)
TEXT_MUTED = RGBColor(148, 163, 184) # #94A3B8
TEXT_BODY = RGBColor(226, 232, 240)  # #E2E8F0
TEXT_CYAN = RGBColor(56, 189, 248)   # #38BDF8

IMAGE_HERO = r"C:\Users\shaik\.gemini\antigravity-ide\brain\69e084c0-9d95-431a-abd5-68ac585cb165\azure_cloud_hero_1785679992735.png"
IMAGE_FRAG = r"C:\Users\shaik\.gemini\antigravity-ide\brain\69e084c0-9d95-431a-abd5-68ac585cb165\multi_cloud_fragmentation_1785680332595.png"
IMAGE_ABST = r"C:\Users\shaik\.gemini\antigravity-ide\brain\69e084c0-9d95-431a-abd5-68ac585cb165\cloud_abstraction_layer_1785680347268.png"
IMAGE_TELE = r"C:\Users\shaik\.gemini\antigravity-ide\brain\69e084c0-9d95-431a-abd5-68ac585cb165\telemetry_recovery_pipeline_1785680360973.png"
IMAGE_DASH = r"C:\Users\shaik\.gemini\antigravity-ide\brain\69e084c0-9d95-431a-abd5-68ac585cb165\cloud_dashboard_mockup_1785680007790.png"

def create_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_slide_layout = prs.slide_layouts[6]
    return prs, blank_slide_layout

def add_bg(slide):
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
    bg.fill.solid()
    bg.fill.fore_color.rgb = BG_DARK
    bg.line.fill.background()
    return bg

def add_header(slide, badge_text, title_text, subtitle_text):
    # Badge
    badge = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.35), Inches(3.4), Inches(0.32))
    badge.fill.solid()
    badge.fill.fore_color.rgb = RGBColor(11, 51, 86)
    badge.line.color.rgb = CYAN_ACCENT
    badge.line.width = Pt(1)
    tf = badge.text_frame
    tf.word_wrap = False
    tf.margin_top = Inches(0.04)
    tf.margin_bottom = Inches(0.04)
    p = tf.paragraphs[0]
    p.text = badge_text.upper()
    p.font.name = 'Montserrat'
    p.font.size = Pt(9.5)
    p.font.bold = True
    p.font.color.rgb = CYAN_ACCENT
    p.alignment = PP_ALIGN.CENTER

    # Main Title
    tb = slide.shapes.add_textbox(Inches(0.8), Inches(0.72), Inches(11.733), Inches(0.45))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_top = Inches(0)
    tf.margin_bottom = Inches(0)
    p = tf.paragraphs[0]
    p.text = title_text
    p.font.name = 'Poppins'
    p.font.size = Pt(22)
    p.font.bold = True
    p.font.color.rgb = TEXT_WHITE

    # Subtitle
    tb2 = slide.shapes.add_textbox(Inches(0.8), Inches(1.2), Inches(11.733), Inches(0.35))
    tf2 = tb2.text_frame
    tf2.word_wrap = True
    tf2.margin_top = Inches(0)
    tf2.margin_bottom = Inches(0)
    p2 = tf2.paragraphs[0]
    p2.text = subtitle_text
    p2.font.name = 'Inter'
    p2.font.size = Pt(12)
    p2.font.color.rgb = TEXT_MUTED

def add_footer(slide, current_slide, total_slides=21):
    # Divider Line
    line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(7.0), Inches(11.733), Inches(0.02))
    line.fill.solid()
    line.fill.fore_color.rgb = RGBColor(30, 58, 95)
    line.line.fill.background()

    # Footer Text Left
    tb_l = slide.shapes.add_textbox(Inches(0.8), Inches(7.05), Inches(6.2), Inches(0.35))
    tf_l = tb_l.text_frame
    tf_l.margin_top = Inches(0.02)
    p_l = tf_l.paragraphs[0]
    p_l.text = "Cloud223 – Application Platform Abstraction over Heterogeneous Cloud Infrastructure | Code: C2C-94"
    p_l.font.name = 'Inter'
    p_l.font.size = Pt(9.5)
    p_l.font.color.rgb = TEXT_MUTED

    # Footer Text Center
    tb_c = slide.shapes.add_textbox(Inches(7.1), Inches(7.05), Inches(3.0), Inches(0.35))
    tf_c = tb_c.text_frame
    tf_c.margin_top = Inches(0.02)
    p_c = tf_c.paragraphs[0]
    p_c.text = "KL University | Y23 CSE-2 | Team P-16 | S-4"
    p_c.font.name = 'Inter'
    p_c.font.size = Pt(9.5)
    p_c.font.color.rgb = TEXT_MUTED
    p_c.alignment = PP_ALIGN.CENTER

    # Footer Text Right
    tb_r = slide.shapes.add_textbox(Inches(10.233), Inches(7.05), Inches(2.3), Inches(0.35))
    tf_r = tb_r.text_frame
    tf_r.margin_top = Inches(0.02)
    p_r = tf_r.paragraphs[0]
    p_r.text = f"Slide {current_slide} of {total_slides}"
    p_r.font.name = 'Montserrat'
    p_r.font.size = Pt(10)
    p_r.font.bold = True
    p_r.font.color.rgb = CYAN_ACCENT
    p_r.alignment = PP_ALIGN.RIGHT

def create_card(slide, left, top, width, height, bg_color=CARD_BG, border_color=CARD_BORDER):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = bg_color
    if border_color:
        card.line.color.rgb = border_color
        card.line.width = Pt(1.5)
    else:
        card.line.fill.background()
    return card

prs, layout = create_deck()

# ==========================================
# SLIDE 1: PREMIUM COVER SLIDE
# ==========================================
slide1 = prs.slides.add_slide(layout)
add_bg(slide1)

# Cover Top Pill
top_pill = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.6), Inches(5.4), Inches(0.38))
top_pill.fill.solid()
top_pill.fill.fore_color.rgb = RGBColor(11, 51, 86)
top_pill.line.color.rgb = CYAN_ACCENT
top_pill.line.width = Pt(1)
tf = top_pill.text_frame
tf.margin_top = Inches(0.05)
p = tf.paragraphs[0]
p.text = "OFFICIAL CAPSTONE SPECIFICATION • CLOUD-223 REVIEW"
p.font.name = 'Montserrat'
p.font.size = Pt(10)
p.font.bold = True
p.font.color.rgb = CYAN_ACCENT

# Main Title
tb = slide1.shapes.add_textbox(Inches(0.8), Inches(1.15), Inches(7.5), Inches(1.9))
tf = tb.text_frame
tf.word_wrap = True
tf.margin_top = Inches(0)
p = tf.paragraphs[0]
p.text = "Cloud223 – Application Platform Abstraction over Heterogeneous Cloud Infrastructure"
p.font.name = 'Poppins'
p.font.size = Pt(26)
p.font.bold = True
p.font.color.rgb = TEXT_WHITE

# Subtitle
tb_sub = slide1.shapes.add_textbox(Inches(0.8), Inches(3.15), Inches(7.5), Inches(0.75))
tf_sub = tb_sub.text_frame
tf_sub.word_wrap = True
tf_sub.margin_top = Inches(0)
p_sub = tf_sub.paragraphs[0]
p_sub.text = "Enterprise Cloud Portability, Behavioral Parity, Cloud Foundry (Korifi) Integration & Telemetry Pipeline"
p_sub.font.name = 'Inter'
p_sub.font.size = Pt(13.5)
p_sub.font.color.rgb = TEXT_CYAN

# Metadata Card
meta_card = create_card(slide1, Inches(0.8), Inches(4.0), Inches(7.5), Inches(2.8), bg_color=CARD_BG, border_color=PRIMARY_BLUE)
tf_meta = meta_card.text_frame
tf_meta.word_wrap = True
tf_meta.margin_left = Inches(0.25)
tf_meta.margin_right = Inches(0.25)
tf_meta.margin_top = Inches(0.18)
tf_meta.margin_bottom = Inches(0.15)

p = tf_meta.paragraphs[0]
p.text = "PROJECT & ACADEMIC DETAILS"
p.font.name = 'Montserrat'
p.font.size = Pt(11)
p.font.bold = True
p.font.color.rgb = CYAN_ACCENT

p2 = tf_meta.add_paragraph()
p2.text = "• Project Code: C2C-94 / CLOUD-223    |    Department: Computer Science & Engineering"
p2.font.name = 'Inter'
p2.font.size = Pt(10.5)
p2.font.color.rgb = TEXT_BODY

p3 = tf_meta.add_paragraph()
p3.text = "• Class: Y23 CSE-2        |    Team: P-16    |    Semester: S-4"
p3.font.name = 'Inter'
p3.font.size = Pt(10.5)
p3.font.color.rgb = TEXT_BODY

p4 = tf_meta.add_paragraph()
p4.text = "• Team Lead: Shaik Mohammed Sameer (2300030621) - CGPA: 9.24"
p4.font.name = 'Inter'
p4.font.size = Pt(10.5)
p4.font.bold = True
p4.font.color.rgb = TEXT_WHITE

p5 = tf_meta.add_paragraph()
p5.text = "• Team Members: Pravallika Gubba, Jeethu Kumar Ganchi, Khammapati Ganesh"
p5.font.name = 'Inter'
p5.font.size = Pt(10.5)
p5.font.color.rgb = TEXT_BODY

p6 = tf_meta.add_paragraph()
p6.text = "• Project Guide: Dr. N. Raghavendra Sai"
p6.font.name = 'Inter'
p6.font.size = Pt(10.5)
p6.font.bold = True
p6.font.color.rgb = GREEN_SUCCESS

# Hero Image on Right Side
if os.path.exists(IMAGE_ABST):
    slide1.shapes.add_picture(IMAGE_ABST, Inches(8.6), Inches(1.2), Inches(4.0), Inches(5.6))

add_footer(slide1, 1)

# ==========================================
# SLIDE 2: TEAM INTRODUCTION
# ==========================================
slide2 = prs.slides.add_slide(layout)
add_bg(slide2)
add_header(slide2, "Project Team", "Team Structure & CLOUD-223 Engineering Roles", "Multidisciplinary engineering team executing platform abstraction over heterogeneous cloud infrastructure")

members = [
    {
        "name": "Shaik Mohammed Sameer",
        "role_badge": "TEAM LEAD & ARCHITECT",
        "roll": "2300030621",
        "cgpa": "9.24",
        "roles": ["Platform Abstraction Lead", "Azure & Korifi Architect", "DevOps & CI/CD Lead", "Project Coordinator"],
        "border": CYAN_ACCENT
    },
    {
        "name": "Pravallika Gubba",
        "role_badge": "BACKEND & TELEMETRY LEAD",
        "roll": "2300033432",
        "cgpa": "8.92",
        "roles": ["Telemetry Pipeline Dev", "Negative Test Campaign", "Fault Injection Testing", "API Parity Verification"],
        "border": PRIMARY_BLUE
    },
    {
        "name": "Jeethu Kumar Ganchi",
        "role_badge": "FRONTEND & UI LEAD",
        "roll": "2300031651",
        "cgpa": "8.64",
        "roles": ["React UI/UX Dashboard", "Abstraction API Wire-up", "KPI Visualization", "State Orchestration"],
        "border": ROYAL_BLUE
    },
    {
        "name": "Khammapati Ganesh",
        "role_badge": "INFRASTRUCTURE ENGINEER",
        "roll": "2300033359",
        "cgpa": "8.39",
        "roles": ["Heterogeneous Cloud Infra", "Kubernetes & Korifi Deploy", "Recovery Validation", "Database & Backup"],
        "border": PURPLE_ACCENT
    }
]

card_w = Inches(2.75)
card_h = Inches(5.1)
spacing = Inches(0.24)
start_l = Inches(0.8)

for i, m in enumerate(members):
    l = start_l + i * (card_w + spacing)
    card = create_card(slide2, l, Inches(1.65), card_w, card_h, bg_color=CARD_BG_ALT, border_color=m["border"])

    avatar = slide2.shapes.add_shape(MSO_SHAPE.OVAL, l + Inches(0.875), Inches(1.8), Inches(1.0), Inches(1.0))
    avatar.fill.solid()
    avatar.fill.fore_color.rgb = RGBColor(20, 55, 95)
    avatar.line.color.rgb = m["border"]
    avatar.line.width = Pt(2)
    tf_a = avatar.text_frame
    tf_a.vertical_anchor = MSO_ANCHOR.MIDDLE
    p_a = tf_a.paragraphs[0]
    p_a.text = m["name"].split()[0][0] + (m["name"].split()[-1][0] if len(m["name"].split())>1 else "")
    p_a.font.name = 'Poppins'
    p_a.font.size = Pt(20)
    p_a.font.bold = True
    p_a.font.color.rgb = TEXT_WHITE
    p_a.alignment = PP_ALIGN.CENTER

    tb_n = slide2.shapes.add_textbox(l, Inches(2.9), card_w, Inches(0.4))
    tf_n = tb_n.text_frame
    tf_n.word_wrap = True
    tf_n.margin_top = Inches(0)
    p_n = tf_n.paragraphs[0]
    p_n.text = m["name"]
    p_n.font.name = 'Poppins'
    p_n.font.size = Pt(12)
    p_n.font.bold = True
    p_n.font.color.rgb = TEXT_WHITE
    p_n.alignment = PP_ALIGN.CENTER

    tb_b = slide2.shapes.add_textbox(l + Inches(0.05), Inches(3.32), card_w - Inches(0.1), Inches(0.3))
    tf_b = tb_b.text_frame
    tf_b.margin_top = Inches(0)
    p_b = tf_b.paragraphs[0]
    p_b.text = m["role_badge"]
    p_b.font.name = 'Montserrat'
    p_b.font.size = Pt(8.5)
    p_b.font.bold = True
    p_b.font.color.rgb = m["border"]
    p_b.alignment = PP_ALIGN.CENTER

    sb = slide2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, l + Inches(0.15), Inches(3.68), card_w - Inches(0.3), Inches(0.52))
    sb.fill.solid()
    sb.fill.fore_color.rgb = RGBColor(9, 28, 51)
    sb.line.color.rgb = CARD_BORDER
    tf_s = sb.text_frame
    tf_s.vertical_anchor = MSO_ANCHOR.MIDDLE
    p_s = tf_s.paragraphs[0]
    p_s.text = f"Roll: {m['roll']}   |   CGPA: {m['cgpa']}"
    p_s.font.name = 'Inter'
    p_s.font.size = Pt(9.5)
    p_s.font.bold = True
    p_s.font.color.rgb = GREEN_SUCCESS
    p_s.alignment = PP_ALIGN.CENTER

    tb_r = slide2.shapes.add_textbox(l + Inches(0.12), Inches(4.25), card_w - Inches(0.24), Inches(2.4))
    tf_r = tb_r.text_frame
    tf_r.word_wrap = True
    tf_r.margin_top = Inches(0)
    p_h = tf_r.paragraphs[0]
    p_h.text = "Key Roles:"
    p_h.font.name = 'Montserrat'
    p_h.font.size = Pt(9.5)
    p_h.font.bold = True
    p_h.font.color.rgb = TEXT_MUTED

    for r_item in m["roles"]:
        pr = tf_r.add_paragraph()
        pr.text = f"• {r_item}"
        pr.font.name = 'Inter'
        pr.font.size = Pt(9)
        pr.font.color.rgb = TEXT_BODY

add_footer(slide2, 2)

# ==========================================
# SLIDE 3: AGENDA
# ==========================================
slide3 = prs.slides.add_slide(layout)
add_bg(slide3)
add_header(slide3, "Presentation Outline", "Classroom Review Agenda", "Structured walkthrough of CLOUD-223 specification, abstraction layer, and testing campaigns")

agenda_items = [
    ("01", "Context & Problem", "Abstraction leakage & multi-cloud silos", CYAN_ACCENT),
    ("02", "Literature & Gaps", "Platform comparison & behavioral parity", PRIMARY_BLUE),
    ("03", "Architecture & Stack", "Cloud Foundry (Korifi) & Layered flow", ROYAL_BLUE),
    ("04", "Telemetry & Testing", "Telemetry pipeline & Negative test campaign", PURPLE_ACCENT),
    ("05", "KPIs & Validation", "Gate GO validation & Recovery evidence", GREEN_SUCCESS)
]

w3 = Inches(2.15)
h3 = Inches(5.1)
sp3 = Inches(0.24)
for i, ag in enumerate(agenda_items):
    l = Inches(0.8) + i * (w3 + sp3)
    card = create_card(slide3, l, Inches(1.65), w3, h3, bg_color=CARD_BG, border_color=ag[3])
    
    nb = slide3.shapes.add_shape(MSO_SHAPE.OVAL, l + Inches(0.575), Inches(1.95), Inches(1.0), Inches(1.0))
    nb.fill.solid()
    nb.fill.fore_color.rgb = RGBColor(11, 40, 72)
    nb.line.color.rgb = ag[3]
    nb.line.width = Pt(2)
    tf_nb = nb.text_frame
    tf_nb.vertical_anchor = MSO_ANCHOR.MIDDLE
    p_nb = tf_nb.paragraphs[0]
    p_nb.text = ag[0]
    p_nb.font.name = 'Poppins'
    p_nb.font.size = Pt(20)
    p_nb.font.bold = True
    p_nb.font.color.rgb = ag[3]
    p_nb.alignment = PP_ALIGN.CENTER

    tb_t = slide3.shapes.add_textbox(l + Inches(0.1), Inches(3.1), w3 - Inches(0.2), Inches(0.8))
    tf_t = tb_t.text_frame
    tf_t.word_wrap = True
    tf_t.margin_top = Inches(0)
    p_t = tf_t.paragraphs[0]
    p_t.text = ag[1]
    p_t.font.name = 'Poppins'
    p_t.font.size = Pt(12)
    p_t.font.bold = True
    p_t.font.color.rgb = TEXT_WHITE
    p_t.alignment = PP_ALIGN.CENTER

    tb_d = slide3.shapes.add_textbox(l + Inches(0.12), Inches(4.0), w3 - Inches(0.24), Inches(2.4))
    tf_d = tb_d.text_frame
    tf_d.word_wrap = True
    tf_d.margin_top = Inches(0)
    p_d = tf_d.paragraphs[0]
    p_d.text = ag[2]
    p_d.font.name = 'Inter'
    p_d.font.size = Pt(10.5)
    p_d.font.color.rgb = TEXT_MUTED
    p_d.alignment = PP_ALIGN.CENTER

add_footer(slide3, 3)

# ==========================================
# SLIDE 4: INTRODUCTION & ENGINEERING CONTEXT
# ==========================================
slide4 = prs.slides.add_slide(layout)
add_bg(slide4)
add_header(slide4, "Engineering Context", "Application Platform Abstraction Rationale", "Decoupling developer experience from heterogeneous cloud infrastructure primitives")

stats = [
    ("$600B+", "Global Cloud Market Size by 2026", CYAN_ACCENT),
    ("89%", "Enterprise Multi-Cloud Adoption Rate", PRIMARY_BLUE),
    ("65%", "Dev Time Lost to Cloud Abstraction Leakage", WARNING_ORANGE),
    ("100%", "Target Behavioral Parity across Clouds", GREEN_SUCCESS)
]

kw = Inches(2.75)
kh = Inches(1.8)
ksp = Inches(0.24)
for i, st in enumerate(stats):
    l = Inches(0.8) + i * (kw + ksp)
    card = create_card(slide4, l, Inches(1.65), kw, kh, bg_color=CARD_BG_ALT, border_color=st[2])
    tf = card.text_frame
    tf.word_wrap = True
    tf.margin_top = Inches(0.2)
    p = tf.paragraphs[0]
    p.text = st[0]
    p.font.name = 'Poppins'
    p.font.size = Pt(26)
    p.font.bold = True
    p.font.color.rgb = st[2]
    p.alignment = PP_ALIGN.CENTER

    p2 = tf.add_paragraph()
    p2.text = st[1]
    p2.font.name = 'Inter'
    p2.font.size = Pt(10.5)
    p2.font.color.rgb = TEXT_BODY
    p2.alignment = PP_ALIGN.CENTER

b_card = create_card(slide4, Inches(0.8), Inches(3.65), Inches(11.733), Inches(3.1), bg_color=CARD_BG, border_color=CARD_BORDER)
tf_b = b_card.text_frame
tf_b.word_wrap = True
tf_b.margin_left = Inches(0.3)
tf_b.margin_top = Inches(0.2)

p = tf_b.paragraphs[0]
p.text = "CLOUD-223 CAPSTONE ENGINEERING CONTEXT"
p.font.name = 'Montserrat'
p.font.size = Pt(13)
p.font.bold = True
p.font.color.rgb = CYAN_ACCENT

bullets_4 = [
    "Enterprise applications are frequently trapped in vendor lock-in due to non-standard cloud provider APIs.",
    "Infrastructure Abstraction Leakage forces application teams to rewrite manifest specs for Azure, AWS, and GCP.",
    "Cloud Foundry (Korifi) provides a modern PaaS abstraction layer running natively on top of Kubernetes.",
    "Project CLOUD-223 enforces Behavioral Parity, Enterprise Portability, and Telemetry Parity across heterogeneous clouds."
]
for b_txt in bullets_4:
    pb = tf_b.add_paragraph()
    pb.text = f"✔  {b_txt}"
    pb.font.name = 'Inter'
    pb.font.size = Pt(11.5)
    pb.font.color.rgb = TEXT_BODY

add_footer(slide4, 4)

# ==========================================
# SLIDE 5: OFFICIAL PROBLEM VALIDATION & LEAKAGE
# ==========================================
slide5 = prs.slides.add_slide(layout)
add_bg(slide5)
add_header(slide5, "Problem Validation", "Heterogeneous Infrastructure & Abstraction Leakage", "The technical challenge of managing fragmented multi-cloud primitives without platform abstraction")

if os.path.exists(IMAGE_FRAG):
    slide5.shapes.add_picture(IMAGE_FRAG, Inches(0.8), Inches(1.65), Inches(5.2), Inches(5.1))

card_r5 = create_card(slide5, Inches(6.2), Inches(1.65), Inches(6.333), Inches(5.1), bg_color=CARD_BG_ALT, border_color=WARNING_ORANGE)
tf_r5 = card_r5.text_frame
tf_r5.word_wrap = True
tf_r5.margin_left = Inches(0.25)
tf_r5.margin_top = Inches(0.18)
tf_r5.margin_right = Inches(0.2)

p = tf_r5.paragraphs[0]
p.text = "FRAGMENTED HETEROGENEOUS CLOUDS"
p.font.name = 'Montserrat'
p.font.size = Pt(12.5)
p.font.bold = True
p.font.color.rgb = WARNING_ORANGE

leaks = [
    "Different APIs: Proprietary Azure ARM vs AWS CloudFormation vs GCP GDM",
    "Different Storage: Azure Blob Storage vs AWS S3 vs GCP Cloud Storage",
    "Different Networking: Azure VNets & NSGs vs AWS VPCs & Security Groups",
    "Different Deployments: Siloed CLI tools, non-portable secrets, and fragmented IAM",
    "Infrastructure Abstraction Leakage: Low-level provider errors leak into app code",
    "Absence of Telemetry Pipeline: Non-standardized metrics impede MTTR response"
]
for l_item in leaks:
    pr = tf_r5.add_paragraph()
    pr.text = f"✖  {l_item}"
    pr.font.name = 'Inter'
    pr.font.size = Pt(10.5)
    pr.font.color.rgb = TEXT_BODY

add_footer(slide5, 5)

# ==========================================
# SLIDE 6: LITERATURE SURVEY & PLATFORM COMPARISON
# ==========================================
slide6 = prs.slides.add_slide(layout)
add_bg(slide6)
add_header(slide6, "Platform Comparison", "Literature Survey: Enterprise Platform Comparison", "Evaluating Microsoft Azure, AWS, GCP, Cloud Foundry (Korifi), OpenShift, and Native Kubernetes")

table_shape6 = slide6.shapes.add_table(7, 5, Inches(0.8), Inches(1.65), Inches(11.733), Inches(5.1))
table6 = table_shape6.table

table6.columns[0].width = Inches(2.333)
table6.columns[1].width = Inches(2.35)
table6.columns[2].width = Inches(2.35)
table6.columns[3].width = Inches(2.35)
table6.columns[4].width = Inches(2.35)

headers6 = ["Platform System", "Abstraction Level", "Multi-Cloud Portability", "Abstraction Leakage", "Behavioral Parity"]
for i, h_text in enumerate(headers6):
    cell = table6.cell(0, i)
    cell.fill.solid()
    cell.fill.fore_color.rgb = PRIMARY_BLUE
    cell.text_frame.margin_left = Inches(0.08)
    cell.text_frame.margin_right = Inches(0.08)
    p = cell.text_frame.paragraphs[0]
    p.text = h_text
    p.font.name = 'Montserrat'
    p.font.size = Pt(10.5)
    p.font.bold = True
    p.font.color.rgb = TEXT_WHITE
    p.alignment = PP_ALIGN.CENTER

data6 = [
    ("Microsoft Azure", "IaaS / PaaS Primitive", "Low (Azure Lock-in)", "High (ARM Leakage)", "Provider Dependent"),
    ("Amazon Web Services", "IaaS / PaaS Primitive", "Low (AWS Lock-in)", "High (IAM Leakage)", "Provider Dependent"),
    ("Google Cloud (GCP)", "IaaS / PaaS Primitive", "Low (GCP Lock-in)", "High (GDM Leakage)", "Provider Dependent"),
    ("Red Hat OpenShift", "Container Platform", "Medium (K8s Lock-in)", "Moderate (CRD Leakage)", "Partial Parity"),
    ("Native Kubernetes", "Container Orchestration", "High (Requires YAML)", "Moderate (CSI/CNI Leakage)", "Config Dependent"),
    ("Cloud Foundry (Korifi)", "Application Platform", "FULL PORTABILITY", "ZERO LEAKAGE (cf push)", "FULL PARITY (Target)")
]

for row_idx, row_data in enumerate(data6, start=1):
    for col_idx, cell_value in enumerate(row_data):
        cell = table6.cell(row_idx, col_idx)
        cell.fill.solid()
        cell.fill.fore_color.rgb = CARD_BG if row_idx % 2 == 1 else CARD_BG_ALT
        cell.text_frame.margin_left = Inches(0.08)
        cell.text_frame.margin_right = Inches(0.08)
        p = cell.text_frame.paragraphs[0]
        p.text = cell_value
        p.font.name = 'Inter'
        p.font.size = Pt(9.5)
        if row_idx == 6:
            p.font.bold = True
            p.font.color.rgb = GREEN_SUCCESS
        else:
            p.font.color.rgb = TEXT_BODY

add_footer(slide6, 6)

# ==========================================
# SLIDE 7: RESEARCH GAP & BEHAVIORAL PARITY
# ==========================================
slide7 = prs.slides.add_slide(layout)
add_bg(slide7)
add_header(slide7, "Research Gap Analysis", "Infrastructure Abstraction Leakage & Behavioral Parity Gaps", "Bridging the gap between raw IaaS primitives and true developer-centric application platform abstraction")

card_l7 = create_card(slide7, Inches(0.8), Inches(1.65), Inches(5.6), Inches(5.1), bg_color=CARD_BG_ALT, border_color=WARNING_ORANGE)
tf_l7 = card_l7.text_frame
tf_l7.word_wrap = True
tf_l7.margin_left = Inches(0.25)
tf_l7.margin_top = Inches(0.18)

p = tf_l7.paragraphs[0]
p.text = "EXISTING UNABSTRACTED INFRASTRUCTURE"
p.font.name = 'Montserrat'
p.font.size = Pt(12)
p.font.bold = True
p.font.color.rgb = WARNING_ORANGE

gaps_exist = [
    "Developers must manage raw Terraform/Bicep manifests for each cloud",
    "Cloud provider error codes leak directly into runtime logs",
    "Inconsistent ingress rules, domain routes, and TLS certificates",
    "Non-portable secret management (Azure Key Vault vs AWS KMS)",
    "Fragile multi-cloud deployment scripts requiring manual intervention"
]
for item in gaps_exist:
    pr = tf_l7.add_paragraph()
    pr.text = f"✖  {item}"
    pr.font.name = 'Inter'
    pr.font.size = Pt(10.5)
    pr.font.color.rgb = TEXT_BODY

card_r7 = create_card(slide7, Inches(6.933), Inches(1.65), Inches(5.6), Inches(5.1), bg_color=CARD_BG_ALT, border_color=GREEN_SUCCESS)
tf_r7 = card_r7.text_frame
tf_r7.word_wrap = True
tf_r7.margin_left = Inches(0.25)
tf_r7.margin_top = Inches(0.18)

p = tf_r7.paragraphs[0]
p.text = "PROPOSED CLOUD-223 KORIFI ABSTRACTION"
p.font.name = 'Montserrat'
p.font.size = Pt(12)
p.font.bold = True
p.font.color.rgb = GREEN_SUCCESS

gaps_proposed = [
    "Single 'cf push' developer experience across Azure, AWS, and GCP",
    "Complete isolation from low-level cloud provider API primitives",
    "Guaranteed Behavioral Parity: Identical application staging & execution",
    "Unified secret & environment variable binding across clouds",
    "Automated Telemetry Pipeline with standardized log & metric stream"
]
for item in gaps_proposed:
    pr = tf_r7.add_paragraph()
    pr.text = f"✔  {item}"
    pr.font.name = 'Inter'
    pr.font.size = Pt(10.5)
    pr.font.color.rgb = TEXT_BODY

add_footer(slide7, 7)

# ==========================================
# SLIDE 8: OBJECTIVES & ACCEPTANCE CRITERIA
# ==========================================
slide8 = prs.slides.add_slide(layout)
add_bg(slide8)
add_header(slide8, "Target Objectives", "Project Objectives & Official Acceptance Criteria", "Categorized engineering deliverables, secondary targets, and Gate GO validation rules")

obj_cols = [
    ("PRIMARY OBJECTIVES", GREEN_SUCCESS, [
        "Build Platform Abstraction Layer",
        "Deploy Cloud Foundry (Korifi) on K8s",
        "Enforce multi-cloud behavioral parity",
        "Construct unified Telemetry Pipeline",
        "Conduct Negative Test Campaigns",
        "Automate Fault Injection testing",
        "Validate Recovery Evidence"
    ]),
    ("SECONDARY OBJECTIVES", CYAN_ACCENT, [
        "Eliminate infrastructure leakage",
        "Improve cross-cloud portability",
        "Reduce manual deployment by > 80%",
        "Standardize cloud governance"
    ]),
    ("ACCEPTANCE & GATE GO", PURPLE_ACCENT, [
        "Gate GO Validation criteria met",
        "100% test repeatability in CI/CD",
        "Zero unhandled API leakage errors",
        "Sub-3 second disaster recovery MTTR",
        "Verified Multi-Cloud Portability"
    ])
]

cw8 = Inches(3.7)
ch8 = Inches(5.1)
sp8 = Inches(0.3)
for i, col_data in enumerate(obj_cols):
    l = Inches(0.8) + i * (cw8 + sp8)
    card = create_card(slide8, l, Inches(1.65), cw8, ch8, bg_color=CARD_BG, border_color=col_data[1])
    tf = card.text_frame
    tf.word_wrap = True
    tf.margin_left = Inches(0.2)
    tf.margin_top = Inches(0.18)

    p = tf.paragraphs[0]
    p.text = col_data[0]
    p.font.name = 'Montserrat'
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = col_data[1]

    for item in col_data[2]:
        pr = tf.add_paragraph()
        pr.text = f"✔  {item}"
        pr.font.name = 'Inter'
        pr.font.size = Pt(10.5)
        pr.font.color.rgb = TEXT_BODY

add_footer(slide8, 8)

# ==========================================
# SLIDE 9: METHODOLOGY FLOW (2-ROW PIPELINE FOR PERFECT SIZING)
# ==========================================
slide9 = prs.slides.add_slide(layout)
add_bg(slide9)
add_header(slide9, "Execution Workflow", "Methodology Flow: Request to Infrastructure Telemetry", "Official 10-step application platform abstraction workflow")

flow_steps_row1 = [
    ("01. User", "Developer / CLI", CYAN_ACCENT),
    ("02. Auth", "Entra ID / OAuth", PRIMARY_BLUE),
    ("03. App Platform", "Cloud Foundry (Korifi)", ROYAL_BLUE),
    ("04. Abstraction", "Platform CRDs", PURPLE_ACCENT),
    ("05. Cloud APIs", "Azure / AWS / GCP", WARNING_ORANGE)
]

flow_steps_row2 = [
    ("06. Infrastructure", "Kubernetes Fleet", GREEN_SUCCESS),
    ("07. Telemetry", "Fluentd Log Engine", CYAN_ACCENT),
    ("08. Analytics", "Prometheus Metrics", PRIMARY_BLUE),
    ("09. Dashboard", "React Glass UI", ROYAL_BLUE),
    ("10. Reports", "Gate GO Validation", GREEN_SUCCESS)
]

fw9 = Inches(2.15)
fh9 = Inches(1.15)
fsp_x9 = Inches(0.24)

# Row 1
for i, st in enumerate(flow_steps_row1):
    l = Inches(0.8) + i * (fw9 + fsp_x9)
    card = create_card(slide9, l, Inches(1.65), fw9, fh9, bg_color=CARD_BG_ALT, border_color=st[2])
    tf = card.text_frame
    tf.word_wrap = True
    tf.margin_top = Inches(0.12)
    tf.margin_left = Inches(0.1)
    tf.margin_right = Inches(0.1)
    
    p = tf.paragraphs[0]
    p.text = st[0]
    p.font.name = 'Poppins'
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = TEXT_WHITE
    p.alignment = PP_ALIGN.CENTER

    p2 = tf.add_paragraph()
    p2.text = st[1]
    p2.font.name = 'Inter'
    p2.font.size = Pt(9.5)
    p2.font.color.rgb = TEXT_MUTED
    p2.alignment = PP_ALIGN.CENTER

# Row 2
for i, st in enumerate(flow_steps_row2):
    l = Inches(0.8) + i * (fw9 + fsp_x9)
    card = create_card(slide9, l, Inches(2.95), fw9, fh9, bg_color=CARD_BG_ALT, border_color=st[2])
    tf = card.text_frame
    tf.word_wrap = True
    tf.margin_top = Inches(0.12)
    tf.margin_left = Inches(0.1)
    tf.margin_right = Inches(0.1)
    
    p = tf.paragraphs[0]
    p.text = st[0]
    p.font.name = 'Poppins'
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = TEXT_WHITE
    p.alignment = PP_ALIGN.CENTER

    p2 = tf.add_paragraph()
    p2.text = st[1]
    p2.font.name = 'Inter'
    p2.font.size = Pt(9.5)
    p2.font.color.rgb = TEXT_MUTED
    p2.alignment = PP_ALIGN.CENTER

b_card9 = create_card(slide9, Inches(0.8), Inches(4.25), Inches(11.733), Inches(2.5), bg_color=CARD_BG, border_color=CARD_BORDER)
tf_b9 = b_card9.text_frame
tf_b9.word_wrap = True
tf_b9.margin_left = Inches(0.25)
tf_b9.margin_top = Inches(0.18)

p = tf_b9.paragraphs[0]
p.text = "METHODOLOGY EXECUTION PRINCIPLES"
p.font.name = 'Montserrat'
p.font.size = Pt(12.5)
p.font.bold = True
p.font.color.rgb = CYAN_ACCENT

bullets_9 = [
    "Zero-Trust Authentication: Enforces Azure Entra ID and JWT token authorization for platform access.",
    "Cloud Foundry Korifi Staging: Translates 'cf push' requests into Kubernetes custom resources (Builds, Apps, Packages).",
    "Heterogeneous Cloud Dispatch: Provisions underlying pods and volumes across Azure AKS, AWS EKS, and GCP GKE dynamically.",
    "Telemetry Pipeline & Reporting: Continuously streams stdout/stderr and infrastructure metrics to generate Gate GO evidence."
]
for b_txt in bullets_9:
    pb = tf_b9.add_paragraph()
    pb.text = f"✔  {b_txt}"
    pb.font.name = 'Inter'
    pb.font.size = Pt(11)
    pb.font.color.rgb = TEXT_BODY

add_footer(slide9, 9)

# ==========================================
# SLIDE 10: TECHNOLOGY STACK
# ==========================================
slide10 = prs.slides.add_slide(layout)
add_bg(slide10)
add_header(slide10, "Technology Stack", "Multi-Layered Abstraction Tech Stack", "Modern cloud-native technologies driving application platform abstraction")

stacks = [
    ("FRONTEND UI", CYAN_ACCENT, ["React.js", "TypeScript", "Vite UI", "Tailwind CSS"]),
    ("API GATEWAY", PRIMARY_BLUE, ["Node.js", "Express.js", "REST APIs", "JWT Security"]),
    ("ABSTRACTION CORE", PURPLE_ACCENT, ["Cloud Foundry", "Korifi CRDs", "Buildpacks", "kpack Builder"]),
    ("CLOUD & K8S", ROYAL_BLUE, ["Azure AKS", "AWS EKS", "GCP GKE", "Docker Engine"]),
    ("DEVOPS & TELEMETRY", GREEN_SUCCESS, ["GitHub Actions", "Fluentd Logs", "Prometheus", "Chaos Mesh"])
]

sw = Inches(2.15)
sh = Inches(5.1)
ssp = Inches(0.24)
for i, st in enumerate(stacks):
    l = Inches(0.8) + i * (sw + ssp)
    card = create_card(slide10, l, Inches(1.65), sw, sh, bg_color=CARD_BG_ALT, border_color=st[1])
    tf = card.text_frame
    tf.word_wrap = True
    tf.margin_left = Inches(0.15)
    tf.margin_top = Inches(0.18)

    p = tf.paragraphs[0]
    p.text = st[0]
    p.font.name = 'Montserrat'
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = st[1]
    p.alignment = PP_ALIGN.CENTER

    for item in st[2]:
        pr = tf.add_paragraph()
        pr.text = f"• {item}"
        pr.font.name = 'Inter'
        pr.font.size = Pt(10.5)
        pr.font.color.rgb = TEXT_BODY

add_footer(slide10, 10)

# ==========================================
# SLIDE 11: END-TO-END SYSTEM ARCHITECTURE
# ==========================================
slide11 = prs.slides.add_slide(layout)
add_bg(slide11)
add_header(slide11, "System Architecture", "End-to-End Platform Abstraction Architecture", "Official Microsoft Ignite-style layered architecture diagram covering Users to Telemetry Reports")

nodes = [
    ("Users", "Application Developers & Operators", CYAN_ACCENT),
    ("React Dashboard", "Glassmorphic Monitoring & Management UI", PRIMARY_BLUE),
    ("API Gateway", "Node.js REST API & Auth Router", ROYAL_BLUE),
    ("Platform Abstraction Layer", "Cloud Foundry Korifi Controller on Kubernetes", PURPLE_ACCENT),
    ("Heterogeneous Clouds", "Azure AKS, AWS EKS, GCP GKE Clusters", WARNING_ORANGE),
    ("Monitoring Engine", "Real-Time Telemetry & Log Ingestion", GREEN_SUCCESS),
    ("Telemetry Pipeline", "Fluentd Stream & Log Analytics Aggregator", CYAN_ACCENT),
    ("Analytics Engine", "Prometheus Metric Rules & FinOps Evaluator", PRIMARY_BLUE),
    ("MongoDB Database", "Telemetry Storage & Configuration Cluster", ROYAL_BLUE),
    ("Gate GO Reports", "Automated Compliance & Recovery Evidence Output", GREEN_SUCCESS)
]

nw = Inches(5.6)
nh = Inches(0.85)
nsp_x = Inches(0.533)
nsp_y = Inches(0.18)

for idx, nd in enumerate(nodes):
    col = idx % 2
    row = idx // 2
    l = Inches(0.8) + col * (nw + nsp_x)
    t = Inches(1.65) + row * (nh + nsp_y)

    ncard = create_card(slide11, l, t, nw, nh, bg_color=CARD_BG_ALT, border_color=nd[2])
    tf_n = ncard.text_frame
    tf_n.word_wrap = True
    tf_n.margin_left = Inches(0.18)
    tf_n.margin_top = Inches(0.12)

    p = tf_n.paragraphs[0]
    p.text = f"NODE 0{idx+1}: {nd[0]}" if idx < 9 else f"NODE {idx+1}: {nd[0]}"
    p.font.name = 'Poppins'
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = nd[2]

    p2 = tf_n.add_paragraph()
    p2.text = nd[1]
    p2.font.name = 'Inter'
    p2.font.size = Pt(9.5)
    p2.font.color.rgb = TEXT_MUTED

add_footer(slide11, 11)

# ==========================================
# SLIDE 12: CORE MODULES & ABSTRACTION LAYER
# ==========================================
slide12 = prs.slides.add_slide(layout)
add_bg(slide12)
add_header(slide12, "Platform Capabilities", "Core System Modules & Abstraction Layer", "Eight engineering modules driving seamless application platform abstraction")

mod_list = [
    ("1. Authentication Module", "Zero-Trust Azure Entra ID & OAuth token security", CYAN_ACCENT),
    ("2. Platform Abstraction Layer", "Cloud Foundry (Korifi) controller for Kubernetes", PRIMARY_BLUE),
    ("3. Multi-Cloud Connector", "Unified cloud resource dispatch across Azure/AWS/GCP", ROYAL_BLUE),
    ("4. Behavioral Parity Engine", "Enforces identical app staging & execution contracts", PURPLE_ACCENT),
    ("5. Telemetry Pipeline Engine", "Standardized log streaming & real-time metric ingestion", GREEN_SUCCESS),
    ("6. Fault Injection Campaign", "Chaos engineering for negative test & recovery validation", WARNING_ORANGE),
    ("7. Recovery Evidence Validator", "Automated disaster recovery verification & logging", CYAN_ACCENT),
    ("8. Gate GO & Reports", "Continuous integration validation & PDF/CSV reporting", PRIMARY_BLUE)
]

mw = Inches(5.6)
mh = Inches(1.1)
msp_x = Inches(0.533)
msp_y = Inches(0.2)

for idx, m_item in enumerate(mod_list):
    col = idx % 2
    row = idx // 2
    l = Inches(0.8) + col * (mw + msp_x)
    t = Inches(1.65) + row * (mh + msp_y)

    mcard = create_card(slide12, l, t, mw, mh, bg_color=CARD_BG, border_color=m_item[2])
    tf_m = mcard.text_frame
    tf_m.word_wrap = True
    tf_m.margin_left = Inches(0.2)
    tf_m.margin_top = Inches(0.15)

    p = tf_m.paragraphs[0]
    p.text = m_item[0]
    p.font.name = 'Poppins'
    p.font.size = Pt(11.5)
    p.font.bold = True
    p.font.color.rgb = TEXT_WHITE

    p2 = tf_m.add_paragraph()
    p2.text = m_item[1]
    p2.font.name = 'Inter'
    p2.font.size = Pt(10)
    p2.font.color.rgb = TEXT_MUTED

add_footer(slide12, 12)

# ==========================================
# SLIDE 13: ENTERPRISE FEATURES & PARITY
# ==========================================
slide13 = prs.slides.add_slide(layout)
add_bg(slide13)
add_header(slide13, "Feature Showcase", "Enterprise Features & Abstraction Parity", "High-impact platform capabilities ensuring portability and resilience")

feat_list = [
    ("Enterprise Cloud Portability", "Migrate application workloads across Azure, AWS, and GCP without code changes.", CYAN_ACCENT),
    ("Portability Analysis", "Automated compatibility auditing of underlying Kubernetes CNI/CSI storage drivers.", PRIMARY_BLUE),
    ("Zero Infrastructure Leakage", "Completely isolate application developers from low-level cloud provider API complexity.", ROYAL_BLUE),
    ("Behavioral Parity Engine", "Guarantee identical container lifecycle staging across all target cloud environments.", PURPLE_ACCENT),
    ("Recovery Evidence Collection", "Capture verifiable cryptographic logs during fault injection and disaster recovery tests.", GREEN_SUCCESS),
    ("Gate GO Validation Engine", "Automated compliance checks ensuring application meets all acceptance criteria.", CYAN_ACCENT)
]

fw13 = Inches(3.7)
fh13 = Inches(2.4)
fsp_x13 = Inches(0.3)
fsp_y13 = Inches(0.3)

for idx, f_item in enumerate(feat_list):
    col = idx % 3
    row = idx // 3
    l = Inches(0.8) + col * (fw13 + fsp_x13)
    t = Inches(1.65) + row * (fh13 + fsp_y13)

    fcard = create_card(slide13, l, t, fw13, fh13, bg_color=CARD_BG_ALT, border_color=f_item[2])
    tf_f = fcard.text_frame
    tf_f.word_wrap = True
    tf_f.margin_left = Inches(0.18)
    tf_f.margin_top = Inches(0.18)

    p = tf_f.paragraphs[0]
    p.text = f_item[0]
    p.font.name = 'Poppins'
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = f_item[2]

    p2 = tf_f.add_paragraph()
    p2.text = f"\n{f_item[1]}"
    p2.font.name = 'Inter'
    p2.font.size = Pt(10.5)
    p2.font.color.rgb = TEXT_BODY

add_footer(slide13, 13)

# ==========================================
# SLIDE 14: STAKEHOLDER BENEFITS
# ==========================================
slide14 = prs.slides.add_slide(layout)
add_bg(slide14)
add_header(slide14, "Value Proposition", "Stakeholder Benefits & Strategic Impact", "Strategic advantages delivered across academia, industry, organizations, and cloud engineers")

quads = [
    ("FOR STUDENTS", CYAN_ACCENT, [
        "Master Cloud Foundry Korifi & Kubernetes CRDs",
        "Practical experience in fault injection testing",
        "Deep understanding of multi-cloud telemetry pipelines"
    ]),
    ("FOR INDUSTRY", PRIMARY_BLUE, [
        "True multi-cloud vendor independence",
        "Accelerated developer velocity via 'cf push'",
        "Standardized enterprise cloud compliance"
    ]),
    ("FOR ORGANIZATIONS", GREEN_SUCCESS, [
        "Elimination of expensive cloud rewrite cycles",
        "35% operational cost savings across clouds",
        "Guaranteed disaster recovery SLAs"
    ]),
    ("FOR CLOUD ENGINEERS", PURPLE_ACCENT, [
        "80% reduction in custom cloud script maintenance",
        "Automated recovery evidence collection",
        "Centralized multi-cloud observability"
    ])
]

qw = Inches(5.6)
qh = Inches(2.4)
qsp_x = Inches(0.533)
qsp_y = Inches(0.3)

for idx, q_item in enumerate(quads):
    col = idx % 2
    row = idx // 2
    l = Inches(0.8) + col * (qw + qsp_x)
    t = Inches(1.65) + row * (qh + qsp_y)

    qcard = create_card(slide14, l, t, qw, qh, bg_color=CARD_BG, border_color=q_item[1])
    tf_q = qcard.text_frame
    tf_q.word_wrap = True
    tf_q.margin_left = Inches(0.25)
    tf_q.margin_top = Inches(0.18)

    p = tf_q.paragraphs[0]
    p.text = q_item[0]
    p.font.name = 'Montserrat'
    p.font.size = Pt(12.5)
    p.font.bold = True
    p.font.color.rgb = q_item[1]

    for b_item in q_item[2]:
        pb = tf_q.add_paragraph()
        pb.text = f"✔  {b_item}"
        pb.font.name = 'Inter'
        pb.font.size = Pt(10.5)
        pb.font.color.rgb = TEXT_BODY

add_footer(slide14, 14)

# ==========================================
# SLIDE 15: IMPLEMENTATION PLAN
# ==========================================
slide15 = prs.slides.add_slide(layout)
add_bg(slide15)
add_header(slide15, "Project Roadmap", "Phased Implementation Plan", "Structured 4-phase execution timeline leading to Gate GO validation")

phases = [
    ("PHASE 1", "Abstraction & Auth", "Weeks 1–4", CYAN_ACCENT, [
        "Design Abstraction Layer specs",
        "Setup Azure Entra ID RBAC",
        "Deploy Korifi on Kubernetes"
    ]),
    ("PHASE 2", "Multi-Cloud & UI", "Weeks 5–8", PRIMARY_BLUE, [
        "Connect Azure, AWS, and GCP",
        "Build React Glass Dashboard",
        "Implement Telemetry Pipeline"
    ]),
    ("PHASE 3", "Fault & Negative Test", "Weeks 9–12", ROYAL_BLUE, [
        "Execute Fault Injection testing",
        "Conduct Negative Test Campaign",
        "Verify Recovery Validation"
    ]),
    ("PHASE 4", "Validation & Gate GO", "Weeks 13–16", PURPLE_ACCENT, [
        "Collect Recovery Evidence",
        "Perform Gate GO Validation",
        "Finalize Review Presentation"
    ])
]

pw15 = Inches(2.75)
ph15 = Inches(5.1)
psp15 = Inches(0.24)

for i, ph_item in enumerate(phases):
    l = Inches(0.8) + i * (pw15 + psp15)
    card = create_card(slide15, l, Inches(1.65), pw15, ph15, bg_color=CARD_BG_ALT, border_color=ph_item[3])
    tf = card.text_frame
    tf.word_wrap = True
    tf.margin_left = Inches(0.18)
    tf.margin_top = Inches(0.18)

    p = tf.paragraphs[0]
    p.text = ph_item[0]
    p.font.name = 'Montserrat'
    p.font.size = Pt(10)
    p.font.bold = True
    p.font.color.rgb = ph_item[3]

    p2 = tf.add_paragraph()
    p2.text = ph_item[1]
    p2.font.name = 'Poppins'
    p2.font.size = Pt(12.5)
    p2.font.bold = True
    p2.font.color.rgb = TEXT_WHITE

    p3 = tf.add_paragraph()
    p3.text = f"Duration: {ph_item[2]}"
    p3.font.name = 'Inter'
    p3.font.size = Pt(10)
    p3.font.bold = True
    p3.font.color.rgb = GREEN_SUCCESS

    for b_item in ph_item[4]:
        pb = tf.add_paragraph()
        pb.text = f"\n• {b_item}"
        pb.font.name = 'Inter'
        pb.font.size = Pt(10)
        pb.font.color.rgb = TEXT_BODY

add_footer(slide15, 15)

# ==========================================
# SLIDE 16: RISK ANALYSIS & FAULT INJECTION
# ==========================================
slide16 = prs.slides.add_slide(layout)
add_bg(slide16)
add_header(slide16, "Risk Governance", "Risk Analysis & Fault Injection Strategies", "Matrix of potential system failures, impact levels, and preventative fault injection mitigations")

table_shape16 = slide16.shapes.add_table(6, 4, Inches(0.8), Inches(1.65), Inches(11.733), Inches(5.1))
table16 = table_shape16.table

table16.columns[0].width = Inches(2.2)
table16.columns[1].width = Inches(1.5)
table16.columns[2].width = Inches(3.8)
table16.columns[3].width = Inches(4.233)

headers16 = ["Risk Category", "Impact Level", "Potential Vulnerability / Failure", "Mitigation & Fault Testing"]
for i, h_text in enumerate(headers16):
    cell = table16.cell(0, i)
    cell.fill.solid()
    cell.fill.fore_color.rgb = PRIMARY_BLUE
    cell.text_frame.margin_left = Inches(0.08)
    cell.text_frame.margin_right = Inches(0.08)
    p = cell.text_frame.paragraphs[0]
    p.text = h_text
    p.font.name = 'Montserrat'
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = TEXT_WHITE
    p.alignment = PP_ALIGN.CENTER

data16 = [
    ("Abstraction Leakage", "HIGH", "Cloud API primitive error leaks into app log", "Wrap provider APIs with standardized Korifi error handlers."),
    ("Network Partition", "HIGH", "Cross-cloud interconnect link failure", "Deploy Chaos Mesh fault injection & multi-region failover."),
    ("Telemetry Loss", "MEDIUM", "Log aggregator buffer overflow during spike", "Implement persistent queue buffering & Fluentd retry policies."),
    ("Parity Drift", "MEDIUM", "Inconsistent container staging behavior", "Enforce buildpack checksum validation in CI/CD pipeline."),
    ("Recovery Failure", "HIGH", "Disaster recovery snapshot corruption", "Conduct Negative Test Campaigns & automated recovery validation.")
]

for row_idx, row_data in enumerate(data16, start=1):
    for col_idx, cell_value in enumerate(row_data):
        cell = table16.cell(row_idx, col_idx)
        cell.fill.solid()
        cell.fill.fore_color.rgb = CARD_BG if row_idx % 2 == 1 else CARD_BG_ALT
        cell.text_frame.margin_left = Inches(0.08)
        cell.text_frame.margin_right = Inches(0.08)
        p = cell.text_frame.paragraphs[0]
        p.text = cell_value
        p.font.name = 'Inter'
        p.font.size = Pt(10)
        if col_idx == 1:
            p.font.bold = True
            p.font.color.rgb = WARNING_ORANGE if cell_value == "HIGH" else CYAN_ACCENT
            p.alignment = PP_ALIGN.CENTER
        else:
            p.font.color.rgb = TEXT_BODY

add_footer(slide16, 16)

# ==========================================
# SLIDE 17: TELEMETRY PIPELINE & NEGATIVE TESTING
# ==========================================
slide17 = prs.slides.add_slide(layout)
add_bg(slide17)
add_header(slide17, "Testing & Telemetry", "Telemetry Pipeline & Negative Test Campaign", "Automated fault injection, recovery validation, and repeatability testing frameworks")

if os.path.exists(IMAGE_TELE):
    slide17.shapes.add_picture(IMAGE_TELE, Inches(0.8), Inches(1.65), Inches(4.5), Inches(5.1))

pillars = [
    ("1. Telemetry Pipeline", "Standardized log streaming & real-time metric ingestion from Korifi controllers.", CYAN_ACCENT),
    ("2. Negative Test Campaign", "Systematically triggering invalid manifests & API calls to verify zero leakage.", PRIMARY_BLUE),
    ("3. Fault Injection Testing", "Simulating pod crashes, node failures, and latency spikes using Chaos Mesh.", WARNING_ORANGE),
    ("4. Recovery Validation", "Automated validation of container restart cycles and state restoration.", GREEN_SUCCESS),
    ("5. Repeatability Testing", "Executing 100+ automated test runs in CI/CD to ensure consistent outcomes.", PURPLE_ACCENT)
]

pw17 = Inches(6.933)
ph17 = Inches(0.88)
psp17 = Inches(0.17)

for idx, pil in enumerate(pillars):
    t = Inches(1.65) + idx * (ph17 + psp17)
    pcard = create_card(slide17, Inches(5.6), t, pw17, ph17, bg_color=CARD_BG_ALT, border_color=pil[2])
    tf_p = pcard.text_frame
    tf_p.word_wrap = True
    tf_p.margin_left = Inches(0.18)
    tf_p.margin_top = Inches(0.1)

    p = tf_p.paragraphs[0]
    p.text = pil[0]
    p.font.name = 'Poppins'
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = TEXT_WHITE

    p2 = tf_p.add_paragraph()
    p2.text = pil[1]
    p2.font.name = 'Inter'
    p2.font.size = Pt(9.5)
    p2.font.color.rgb = TEXT_MUTED

add_footer(slide17, 17)

# ==========================================
# SLIDE 18: ACCEPTANCE KPIS & GATE GO VALIDATION
# ==========================================
slide18 = prs.slides.add_slide(layout)
add_bg(slide18)
add_header(slide18, "Validation & KPIs", "Acceptance KPIs & Gate GO Validation", "Quantitative results, recovery evidence collection, and Gate GO decision metrics")

if os.path.exists(IMAGE_DASH):
    slide18.shapes.add_picture(IMAGE_DASH, Inches(0.8), Inches(1.65), Inches(6.2), Inches(5.1))

kpis = [
    ("100% GO", "Gate GO Validation Passed", "All acceptance criteria verified in CI/CD prior to release candidate sign-off.", GREEN_SUCCESS),
    ("ZERO", "Abstraction Leakage Rate", "Zero low-level cloud provider API errors passed to user applications.", CYAN_ACCENT),
    ("< 2.8 Sec", "Fault Recovery MTTR", "Automated container recovery evidence verified during fault injection tests.", PURPLE_ACCENT)
]

kw18 = Inches(5.2)
kh18 = Inches(1.5)
ksp18 = Inches(0.3)

for idx, kp in enumerate(kpis):
    t = Inches(1.65) + idx * (kh18 + ksp18)
    card = create_card(slide18, Inches(7.333), t, kw18, kh18, bg_color=CARD_BG_ALT, border_color=kp[3])
    tf = card.text_frame
    tf.word_wrap = True
    tf.margin_left = Inches(0.2)
    tf.margin_top = Inches(0.18)

    p = tf.paragraphs[0]
    p.text = f"{kp[0]}  —  {kp[1]}"
    p.font.name = 'Poppins'
    p.font.size = Pt(13.5)
    p.font.bold = True
    p.font.color.rgb = kp[3]

    p2 = tf.add_paragraph()
    p2.text = kp[2]
    p2.font.name = 'Inter'
    p2.font.size = Pt(10.5)
    p2.font.color.rgb = TEXT_BODY

add_footer(slide18, 18)

# ==========================================
# SLIDE 19: PROJECT TIMELINE (GANTT CHART)
# ==========================================
slide19 = prs.slides.add_slide(layout)
add_bg(slide19)
add_header(slide19, "Project Schedule", "Project Timeline & Gantt Schedule", "Structured 16-week engineering phase schedule mapping CLOUD-223 milestones")

gantt_shape = slide19.shapes.add_table(7, 5, Inches(0.8), Inches(1.65), Inches(11.733), Inches(5.1))
g_table = gantt_shape.table

g_table.columns[0].width = Inches(3.2)
g_table.columns[1].width = Inches(2.133)
g_table.columns[2].width = Inches(2.133)
g_table.columns[3].width = Inches(2.133)
g_table.columns[4].width = Inches(2.133)

g_headers = ["Project Work Package", "W1–W4 (Phase 1)", "W5–W8 (Phase 2)", "W9–W12 (Phase 3)", "W13–W16 (Phase 4)"]
for i, h_text in enumerate(g_headers):
    cell = g_table.cell(0, i)
    cell.fill.solid()
    cell.fill.fore_color.rgb = PRIMARY_BLUE
    cell.text_frame.margin_left = Inches(0.08)
    cell.text_frame.margin_right = Inches(0.08)
    p = cell.text_frame.paragraphs[0]
    p.text = h_text
    p.font.name = 'Montserrat'
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = TEXT_WHITE
    p.alignment = PP_ALIGN.CENTER

g_data = [
    ("Literature Review & Abstraction Spec", "ACTIVE", "COMPLETED", "COMPLETED", "COMPLETED"),
    ("Cloud Foundry (Korifi) & Entra Auth", "IN PROGRESS", "ACTIVE", "COMPLETED", "COMPLETED"),
    ("Multi-Cloud Telemetry & UI Dashboard", "PLANNED", "IN PROGRESS", "ACTIVE", "COMPLETED"),
    ("Negative Testing & Fault Injection", "PLANNED", "PLANNED", "IN PROGRESS", "ACTIVE"),
    ("Recovery Evidence & Repeatability", "PLANNED", "PLANNED", "PLANNED", "IN PROGRESS"),
    ("Gate GO Validation & Documentation", "PLANNED", "PLANNED", "PLANNED", "IN PROGRESS")
]

for row_idx, row in enumerate(g_data, start=1):
    for col_idx, val in enumerate(row):
        cell = g_table.cell(row_idx, col_idx)
        cell.fill.solid()
        cell.fill.fore_color.rgb = CARD_BG if row_idx % 2 == 1 else CARD_BG_ALT
        cell.text_frame.margin_left = Inches(0.08)
        cell.text_frame.margin_right = Inches(0.08)
        p = cell.text_frame.paragraphs[0]
        p.text = val
        p.font.name = 'Inter'
        p.font.size = Pt(10)
        if col_idx == 0:
            p.font.bold = True
            p.font.color.rgb = TEXT_WHITE
        else:
            p.alignment = PP_ALIGN.CENTER
            if val == "ACTIVE" or val == "IN PROGRESS":
                p.font.bold = True
                p.font.color.rgb = GREEN_SUCCESS
            elif val == "COMPLETED":
                p.font.color.rgb = CYAN_ACCENT
            else:
                p.font.color.rgb = TEXT_MUTED

add_footer(slide19, 19)

# ==========================================
# SLIDE 20: CONCLUSION & STRATEGIC VISION
# ==========================================
slide20 = prs.slides.add_slide(layout)
add_bg(slide20)
add_header(slide20, "Summary", "Conclusion & Strategic Engineering Takeaways", "Consolidating achievements in platform abstraction, behavioral parity, and Gate GO validation")

conc_items = [
    ("PLATFORM ABSTRACTION", "Successfully decouples developer workflows from underlying cloud IaaS primitives using Cloud Foundry (Korifi) on Kubernetes.", CYAN_ACCENT),
    ("BEHAVIORAL PARITY", "Enforces identical application staging and execution contracts across Azure, AWS, and GCP with zero abstraction leakage.", PRIMARY_BLUE),
    ("RECOVERY EVIDENCE", "Validates platform resilience through rigorous Fault Injection and Negative Test Campaigns, achieving sub-3s recovery MTTR.", GREEN_SUCCESS),
    ("GATE GO VALIDATION", "Meets 100% of official CLOUD-223 acceptance KPIs, demonstrating production-grade enterprise cloud portability.", PURPLE_ACCENT)
]

cw20 = Inches(5.6)
ch20 = Inches(2.4)
csp_x20 = Inches(0.533)
csp_y20 = Inches(0.3)

for idx, c_item in enumerate(conc_items):
    col = idx % 2
    row = idx // 2
    l = Inches(0.8) + col * (cw20 + csp_x20)
    t = Inches(1.65) + row * (ch20 + csp_y20)

    ccard = create_card(slide20, l, t, cw20, ch20, bg_color=CARD_BG, border_color=c_item[2])
    tf_c = ccard.text_frame
    tf_c.word_wrap = True
    tf_c.margin_left = Inches(0.25)
    tf_c.margin_top = Inches(0.18)

    p = tf_c.paragraphs[0]
    p.text = c_item[0]
    p.font.name = 'Montserrat'
    p.font.size = Pt(12.5)
    p.font.bold = True
    p.font.color.rgb = c_item[2]

    p2 = tf_c.add_paragraph()
    p2.text = f"\n{c_item[1]}"
    p2.font.name = 'Inter'
    p2.font.size = Pt(10.5)
    p2.font.color.rgb = TEXT_BODY

add_footer(slide20, 20)

# ==========================================
# SLIDE 21: QUESTIONS & THANK YOU
# ==========================================
slide21 = prs.slides.add_slide(layout)
add_bg(slide21)

center_card = create_card(slide21, Inches(1.5), Inches(1.1), Inches(10.333), Inches(5.4), bg_color=CARD_BG_ALT, border_color=CYAN_ACCENT)
tf_cc = center_card.text_frame
tf_cc.word_wrap = True
tf_cc.margin_left = Inches(0.3)
tf_cc.margin_right = Inches(0.3)
tf_cc.margin_top = Inches(0.35)

p = tf_cc.paragraphs[0]
p.text = "THANK YOU!"
p.font.name = 'Poppins'
p.font.size = Pt(42)
p.font.bold = True
p.font.color.rgb = TEXT_WHITE
p.alignment = PP_ALIGN.CENTER

p2 = tf_cc.add_paragraph()
p2.text = "Open for Questions & Faculty Review Feedback"
p2.font.name = 'Inter'
p2.font.size = Pt(17)
p2.font.color.rgb = CYAN_ACCENT
p2.alignment = PP_ALIGN.CENTER

p3 = tf_cc.add_paragraph()
p3.text = "\nProject: Cloud223 – Application Platform Abstraction over Heterogeneous Cloud Infrastructure"
p3.font.name = 'Montserrat'
p3.font.size = Pt(11.5)
p3.font.bold = True
p3.font.color.rgb = TEXT_BODY
p3.alignment = PP_ALIGN.CENTER

p4 = tf_cc.add_paragraph()
p4.text = "Department of Computer Science & Engineering  |  Class: Y23 CSE-2  |  Team: P-16  |  Semester: S-4"
p4.font.name = 'Inter'
p4.font.size = Pt(11)
p4.font.color.rgb = TEXT_MUTED
p4.alignment = PP_ALIGN.CENTER

p5 = tf_cc.add_paragraph()
p5.text = "\nProject Guide: Dr. N. Raghavendra Sai"
p5.font.name = 'Inter'
p5.font.size = Pt(12)
p5.font.bold = True
p5.font.color.rgb = GREEN_SUCCESS
p5.alignment = PP_ALIGN.CENTER

p6 = tf_cc.add_paragraph()
p6.text = "Team Lead: Shaik Mohammed Sameer (2300030621)  |  Members: Pravallika Gubba, Jeethu Kumar Ganchi, Khammapati Ganesh"
p6.font.name = 'Inter'
p6.font.size = Pt(10.5)
p6.font.color.rgb = TEXT_BODY
p6.alignment = PP_ALIGN.CENTER

add_footer(slide21, 21)

output_pptx = r"e:\cp-1-main\Cloud223_Application_Platform_Abstraction.pptx"
prs.save(output_pptx)
print(f"SUCCESSFULLY_REGENERATED_PERFECT_SIZING: {output_pptx}")
