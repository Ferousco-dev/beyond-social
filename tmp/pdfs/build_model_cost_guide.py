from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)

OUTPUT = "output/pdf/video-model-cost-and-use-guide.pdf"

models = [
    ("HeyGen Digital Twin", "Speaking video of a trained digital twin from a script.", "Founders, coaches, creators and brands needing a repeatable on-camera presence.", "Trained-twin users. Not catalogued or plan-gated.", "10", "$0.50 for 30 sec", "$1.11-$1.30", "Requires HEYGEN_CREDIT_COST=10. Do not use a flat fee for longer videos."),
    ("InfiniteTalk", "Photo + voice talking avatar.", "Quick talking-head drafts and simple avatar posts.", "Free", "5", "$0.25", "$0.56-$0.65", "15-second maximum is priced as a flat run."),
    ("Kling Avatar", "720p photo + voice talking avatar.", "Social creators and small businesses making spokesperson or UGC-style clips.", "Free", "12", "$0.60", "$1.33-$1.56", ""),
    ("Kling Avatar Pro", "1080p photo + voice talking avatar.", "Paid creators producing polished, client-facing avatar videos.", "Creator", "24", "$1.20", "$2.67-$3.12", ""),
    ("OmniHuman 1.5", "Expressive avatar with fuller-body motion.", "Premium creator content, ads and brand storytelling.", "Creator", "22", "$1.10", "$2.44-$2.86", ""),
    ("Volcengine Video Dub", "Re-dubs existing footage to replacement audio.", "Localization and dubbing workflows.", "Studio, inactive", "30", "$1.50", "$3.33-$3.90", "Price is a placeholder. Do not enable before rate verification."),
    ("Kling 3.0", "High-fidelity text-to-video or image-to-video with audio, up to 15 sec.", "Creator-quality social ads, product shots and cinematic short-form video.", "Creator", "30", "$1.50", "$3.33-$3.90", ""),
    ("Kling Motion Control", "Transfers a driving video's movement onto a character.", "Advanced performance, dance and camera-movement recreation.", "Creator", "60", "$3.00", "$6.67-$7.80", ""),
    ("Veo 3 Fast", "Fast 720p text-to-video or image-to-video.", "Idea testing, frequent iteration and draft social posts.", "Free", "6", "$0.30", "$0.67-$0.78", ""),
    ("Seedance 1.5 Pro", "Lower-cost text-to-video or image-to-video, with longer duration support.", "Budget-conscious creators producing frequent or longer social clips.", "Free", "3", "$0.15", "$0.33-$0.39", ""),
    ("Veo 3", "Higher-quality Veo generation with stronger motion and prompt adherence.", "Users who need a step up from Veo 3 Fast.", "Free", "12", "$0.60", "$1.33-$1.56", ""),
    ("Veo 3 Lite", "Lowest-cost draft video generation.", "Fast concept testing and rough iterations.", "Free", "3", "$0.15", "$0.33-$0.39", ""),
    ("Wan Video Edit", "Prompt-based edits to elements in existing footage.", "Changing an outfit, object, background or scene in a video.", "Creator", "30", "$1.50", "$3.33-$3.90", "Price needs provider-rate verification."),
    ("Wan Reference to Video", "Video from references while preserving character consistency.", "Brand and narrative work requiring a consistent subject across clips.", "Creator", "30", "$1.50", "$3.33-$3.90", "Price needs provider-rate verification."),
    ("Wan Video to Video", "Restyles existing footage while retaining its motion/content.", "Repurposing footage into a new visual look or campaign style.", "Creator", "30", "$1.50", "$3.33-$3.90", "Price needs provider-rate verification."),
    ("Gemini Omni", "Multimodal generation/editing using image and video references.", "Advanced workflows combining prompts, images and footage.", "Creator", "30", "$1.50", "$3.33-$3.90", "Price needs provider-rate verification."),
]

page_width, page_height = landscape(A4)
styles = getSampleStyleSheet()
title = ParagraphStyle("Title", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=21, leading=25, textColor=colors.HexColor("#14213D"), spaceAfter=5)
subtitle = ParagraphStyle("Subtitle", parent=styles["Normal"], fontName="Helvetica", fontSize=9.5, leading=13, textColor=colors.HexColor("#52606D"), spaceAfter=10)
cell = ParagraphStyle("Cell", parent=styles["Normal"], fontName="Helvetica", fontSize=6.6, leading=8.2, textColor=colors.HexColor("#1F2933"), alignment=TA_LEFT)
head = ParagraphStyle("Head", parent=cell, fontName="Helvetica-Bold", fontSize=6.8, leading=8.2, textColor=colors.white)
note = ParagraphStyle("Note", parent=styles["Normal"], fontName="Helvetica", fontSize=7.5, leading=10, textColor=colors.HexColor("#52606D"))

def p(value, style=cell):
    return Paragraph(value.replace("&", "&amp;"), style)

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#D9E2EC"))
    canvas.line(14 * mm, 12 * mm, page_width - 14 * mm, 12 * mm)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(colors.HexColor("#627D98"))
    canvas.drawString(14 * mm, 7.5 * mm, "Beyond Social | Model pricing and use guide")
    canvas.drawRightString(page_width - 14 * mm, 7.5 * mm, f"Page {doc.page}")
    canvas.restoreState()

doc = SimpleDocTemplate(OUTPUT, pagesize=landscape(A4), leftMargin=14 * mm, rightMargin=14 * mm, topMargin=13 * mm, bottomMargin=17 * mm)
story = [
    Paragraph("Video and Avatar Model Cost Guide", title),
    Paragraph("Per-generation pricing, intended use and eligible customer segment. Dollar figures are the code's internal provider-cost basis and customer value when credits are purchased in a pack.", subtitle),
]

headers = ["Model", "What it is used for", "Best for", "Eligible users", "Credits", "Provider-cost basis", "Customer value", "Pricing note"]
data = [[p(h, head) for h in headers]]
for row in models:
    data.append([p(v) for v in row])

widths = [25*mm, 45*mm, 48*mm, 34*mm, 13*mm, 24*mm, 25*mm, 35*mm]
table = Table(data, colWidths=widths, repeatRows=1, splitByRow=1)
table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#14213D")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#D9E2EC")),
    ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#F8FAFC")),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
    ("LEFTPADDING", (0, 0), (-1, -1), 4),
    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ("TOPPADDING", (0, 0), (-1, -1), 4),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
]))
story.append(table)
doc.build(story, onFirstPage=footer, onLaterPages=footer)
