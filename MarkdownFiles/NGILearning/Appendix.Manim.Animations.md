# Appendix — Manim Animations for NGI Learning Module
**Last Updated:** October 2, 2025  
**Library:** Manim Community Edition (v0.18.1+)  
**GitHub:** https://github.com/manimcommunity/manim  
**Inspiration:** 3Blue1Brown (Grant Sanderson)

## 0) Overview & Philosophy

The NGI Learning Module uses **Manim** (Mathematical Animation Engine) to create 3Blue1Brown-style animated lessons that make complex financial, accounting, and business concepts visually intuitive and engaging. Manim is a Python library that creates precise, programmatic animations perfect for explanatory content.

**Why Manim for Finance Education?**
- **Visual-First Learning:** Complex concepts (DCF waterfalls, working capital cycles, revenue buildups) become intuitive with animation
- **Programmatic Precision:** All numbers, formulas, and charts are code-driven, ensuring accuracy
- **Reusable Components:** Build animation templates once, apply to all 10 curated companies
- **Engagement:** Animated content significantly increases retention vs. static slides
- **Professional Quality:** Same engine used by world's best math education channel

## 1) Technical Setup

### Installation
```python
# Already added to requirements.txt
pip install manim>=0.18.1
pip install pycairo>=1.27.0

# FFmpeg required (system package manager)
# Windows: choco install ffmpeg
# macOS: brew install ffmpeg
# Linux: apt-get install ffmpeg
```

### Project Structure
```
src/api/learning/animations/
  __init__.py
  base.py                    # Base animation classes and utilities
  business_foundations/
    __init__.py
    business_model_canvas.py # BMC animations
    unit_economics.py        # CLV/CAC, contribution margin
    moats.py                 # Competitive moats visualization
  accounting/
    __init__.py
    three_statement.py       # 3-statement linkage flows
    working_capital.py       # WC cycle animation
    cash_flow.py             # Indirect method waterfall
  finance/
    __init__.py
    revenue_drivers.py       # Q x P buildup
    dcf_waterfall.py         # DCF components flow
    wacc.py                  # WACC calculation tree
    comps_table.py           # Comparable companies animation
  renderers.py               # Video/GIF rendering utilities
  cache.py                   # Animation caching system
```

### Rendering Pipeline
```python
# Backend: Generate animations on-demand or pre-render
# Storage: /uploads/learning-animations/{company}/{lesson_id}.mp4
# Delivery: Signed URLs served to Next.js frontend
# Format: MP4 (video) or WebM for web compatibility
# Quality: 1080p @ 30fps for V1
```

## 2) Core Animation Components

### 2.1 Financial Charts & Graphs

**Revenue Buildup Animation**
```python
from manim import *

class RevenueDriversBuildupTSLA(Scene):
    """
    Animates Tesla's revenue model: Q (deliveries) x P (ASP) = Revenue
    Shows quarterly data building up with real numbers from 10-K
    """
    def construct(self):
        # Title
        title = Text("Tesla Revenue Model", font_size=48, color=BLUE)
        title.to_edge(UP)
        self.play(Write(title))
        self.wait(0.5)
        
        # Axes setup
        axes = Axes(
            x_range=[0, 5, 1],  # Q1-Q4 + FY
            y_range=[0, 100, 20],  # $B
            x_length=10,
            y_length=6,
            axis_config={"include_tip": False, "font_size": 36},
        )
        axes_labels = axes.get_axis_labels(
            x_label="Quarter", 
            y_label="Revenue ($B)"
        )
        
        self.play(Create(axes), Write(axes_labels))
        self.wait(0.5)
        
        # Data: Q1-Q4 2024 (example)
        quarters = ["Q1", "Q2", "Q3", "Q4"]
        deliveries = [387, 444, 463, 495]  # thousands
        asp = [45.2, 44.8, 43.9, 44.5]  # $K
        revenue = [a * d / 1000 for a, d in zip(asp, deliveries)]  # $B
        
        # Animate bar buildup
        bars = VGroup()
        for i, (q, rev) in enumerate(zip(quarters, revenue)):
            bar = Rectangle(
                width=0.8,
                height=rev / 100 * 6,  # scale to axes
                fill_color=BLUE,
                fill_opacity=0.7,
                stroke_color=WHITE,
                stroke_width=2
            )
            bar.move_to(axes.c2p(i + 1, rev / 2))
            
            # Label
            label = Text(f"${rev:.1f}B", font_size=24, color=WHITE)
            label.next_to(bar, UP, buff=0.1)
            
            bars.add(VGroup(bar, label))
            self.play(GrowFromEdge(bar, DOWN), Write(label), run_time=0.8)
            self.wait(0.3)
        
        # Driver formula overlay
        formula = MathTex(
            r"\text{Revenue} = \text{Deliveries} \times \text{ASP}",
            font_size=40,
            color=YELLOW
        )
        formula.to_edge(DOWN, buff=1)
        self.play(Write(formula))
        self.wait(2)
        
        # Highlight Q-over-Q growth
        growth_arrow = Arrow(
            bars[0][0].get_top(),
            bars[3][0].get_top(),
            color=GREEN,
            stroke_width=6
        )
        growth_text = Text("+28% YoY", font_size=32, color=GREEN)
        growth_text.next_to(growth_arrow, UP)
        
        self.play(GrowArrow(growth_arrow), Write(growth_text))
        self.wait(2)
        
        self.play(*[FadeOut(mob) for mob in self.mobjects])
```

**DCF Waterfall Animation**
```python
from manim import *

class DCFWaterfallCOST(Scene):
    """
    Animates Costco DCF valuation waterfall:
    EBITDA → NOPAT → FCFF → PV → Terminal Value → Enterprise Value → Equity Value
    """
    def construct(self):
        title = Text("DCF Valuation: Costco", font_size=48, color=BLUE)
        title.to_edge(UP)
        self.play(Write(title))
        
        # Components ($ millions)
        components = [
            ("EBITDA", 9500, BLUE),
            ("- D&A", -2200, RED),
            ("EBIT", 7300, BLUE),
            ("- Taxes", -1750, RED),
            ("NOPAT", 5550, GREEN),
            ("+ D&A", 2200, GREEN),
            ("- CapEx", -1800, RED),
            ("- ∆WC", -300, RED),
            ("FCFF", 5650, YELLOW),
            ("PV (5yr)", 24000, PURPLE),
            ("Terminal", 86000, PURPLE),
            ("EV", 110000, GOLD),
            ("- Debt", -7500, RED),
            ("+ Cash", 15000, GREEN),
            ("Equity", 117500, GOLD),
        ]
        
        y_start = 2.5
        y_step = 0.4
        bars = VGroup()
        running_value = 0
        
        for i, (label, value, color) in enumerate(components):
            # Create bar
            bar_width = abs(value) / 120000 * 8  # scale
            bar = Rectangle(
                width=bar_width,
                height=0.3,
                fill_color=color,
                fill_opacity=0.8,
                stroke_color=WHITE
            )
            
            # Position
            y_pos = y_start - i * y_step
            bar.move_to([0, y_pos, 0])
            
            # Label left
            text_label = Text(label, font_size=24, color=WHITE)
            text_label.next_to(bar, LEFT, buff=0.2)
            
            # Value right
            text_value = Text(f"${value:,}", font_size=24, color=color)
            text_value.next_to(bar, RIGHT, buff=0.2)
            
            group = VGroup(bar, text_label, text_value)
            bars.add(group)
            
            # Animate
            self.play(
                GrowFromEdge(bar, LEFT),
                Write(text_label),
                Write(text_value),
                run_time=0.6
            )
            
            # Highlight key stages
            if label in ["FCFF", "EV", "Equity"]:
                box = SurroundingRectangle(group, color=YELLOW, buff=0.1)
                self.play(Create(box), run_time=0.4)
                self.play(FadeOut(box), run_time=0.3)
            
            self.wait(0.2)
        
        # Final valuation per share
        shares = 443  # million
        price_per_share = 117500 / shares
        
        final_box = Rectangle(
            width=6,
            height=1.2,
            fill_color=GOLD,
            fill_opacity=0.3,
            stroke_color=GOLD,
            stroke_width=4
        )
        final_box.to_edge(DOWN, buff=1)
        
        final_text = VGroup(
            Text("Fair Value per Share", font_size=32, color=WHITE),
            Text(f"${price_per_share:.2f}", font_size=48, color=GOLD, weight=BOLD)
        ).arrange(DOWN, buff=0.2)
        final_text.move_to(final_box.get_center())
        
        self.play(Create(final_box), Write(final_text), run_time=1.5)
        self.wait(3)
        
        self.play(*[FadeOut(mob) for mob in self.mobjects])
```

### 2.2 Working Capital Cycle

**Working Capital Animation**
```python
from manim import *

class WorkingCapitalCycleUBER(Scene):
    """
    Animates the working capital cycle for Uber:
    Cash → Operations → AR/Inventory → Cash (circular flow)
    Shows DSO, DIO, DPO calculations and cash conversion cycle
    """
    def construct(self):
        title = Text("Working Capital Cycle: Uber", font_size=44, color=BLUE)
        title.to_edge(UP)
        self.play(Write(title))
        
        # Create circular flow
        center = ORIGIN
        radius = 2.5
        
        # Nodes
        cash = Circle(radius=0.6, color=GREEN, fill_opacity=0.8)
        cash.shift(UP * radius)
        cash_label = Text("Cash", font_size=28, color=WHITE)
        cash_label.move_to(cash.get_center())
        
        operations = Circle(radius=0.6, color=BLUE, fill_opacity=0.8)
        operations.shift(RIGHT * radius)
        ops_label = Text("Operations", font_size=24, color=WHITE)
        ops_label.move_to(operations.get_center())
        
        ar = Circle(radius=0.6, color=YELLOW, fill_opacity=0.8)
        ar.shift(DOWN * radius)
        ar_label = Text("Receivables", font_size=24, color=WHITE)
        ar_label.move_to(ar.get_center())
        
        payables = Circle(radius=0.6, color=RED, fill_opacity=0.8)
        payables.shift(LEFT * radius)
        pay_label = Text("Payables", font_size=24, color=WHITE)
        pay_label.move_to(payables.get_center())
        
        # Animate nodes
        self.play(
            GrowFromCenter(cash), Write(cash_label),
            run_time=0.8
        )
        self.play(
            GrowFromCenter(operations), Write(ops_label),
            run_time=0.8
        )
        self.play(
            GrowFromCenter(ar), Write(ar_label),
            run_time=0.8
        )
        self.play(
            GrowFromCenter(payables), Write(pay_label),
            run_time=0.8
        )
        
        # Arrows showing flow
        arrow1 = Arrow(cash.get_bottom(), operations.get_top(), color=WHITE, buff=0.1)
        arrow2 = Arrow(operations.get_bottom(), ar.get_top(), color=WHITE, buff=0.1)
        arrow3 = Arrow(ar.get_left(), payables.get_right(), color=WHITE, buff=0.1)
        arrow4 = Arrow(payables.get_top(), cash.get_bottom(), color=WHITE, buff=0.1)
        
        self.play(GrowArrow(arrow1), run_time=0.6)
        self.wait(0.3)
        self.play(GrowArrow(arrow2), run_time=0.6)
        self.wait(0.3)
        self.play(GrowArrow(arrow3), run_time=0.6)
        self.wait(0.3)
        self.play(GrowArrow(arrow4), run_time=0.6)
        
        # DSO/DPO calculations
        metrics_box = Rectangle(
            width=5,
            height=2.5,
            fill_color=BLACK,
            fill_opacity=0.8,
            stroke_color=BLUE,
            stroke_width=2
        )
        metrics_box.to_corner(DR, buff=0.5)
        
        metrics_text = VGroup(
            Text("Cash Conversion Cycle", font_size=28, color=YELLOW),
            MathTex(r"\text{DSO: } 28 \text{ days}", font_size=24, color=WHITE),
            MathTex(r"\text{DPO: } 45 \text{ days}", font_size=24, color=WHITE),
            MathTex(r"\text{CCC: } -17 \text{ days}", font_size=28, color=GREEN, weight=BOLD),
            Text("(Negative = Good!)", font_size=20, color=GREEN)
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.2)
        metrics_text.move_to(metrics_box.get_center())
        
        self.play(Create(metrics_box), Write(metrics_text), run_time=2)
        self.wait(3)
        
        self.play(*[FadeOut(mob) for mob in self.mobjects])
```

### 2.3 Business Model Canvas (Interactive)

**BMC Animation**
```python
from manim import *

class BusinessModelCanvasTSLA(Scene):
    """
    Animates the 9 components of Tesla's Business Model Canvas
    with interconnected relationships
    """
    def construct(self):
        title = Text("Tesla Business Model Canvas", font_size=44, color=BLUE)
        title.to_edge(UP)
        self.play(Write(title))
        self.wait(0.5)
        
        # Create 9 boxes (BMC layout)
        box_width = 2.5
        box_height = 1.5
        
        # Top row: Key Partners, Key Activities, Value Prop, Customer Relationships, Customer Segments
        key_partners = self.create_bmc_box(
            "Key Partners",
            ["Battery suppliers", "Gigafactory partners", "Charging networks"],
            BLUE,
            [-5, 2, 0],
            box_width,
            box_height
        )
        
        key_activities = self.create_bmc_box(
            "Key Activities",
            ["Vehicle design", "Manufacturing", "Software dev"],
            BLUE,
            [-2.5, 2, 0],
            box_width,
            box_height
        )
        
        value_prop = self.create_bmc_box(
            "Value Proposition",
            ["Zero-emission", "Performance", "Autonomy"],
            YELLOW,
            [0, 2, 0],
            box_width,
            box_height
        )
        
        customer_rel = self.create_bmc_box(
            "Customer Relationships",
            ["Direct sales", "OTA updates", "Community"],
            BLUE,
            [2.5, 2, 0],
            box_width,
            box_height
        )
        
        customer_seg = self.create_bmc_box(
            "Customer Segments",
            ["Early adopters", "Premium buyers", "Fleet/commercial"],
            GREEN,
            [5, 2, 0],
            box_width,
            box_height
        )
        
        # Middle row: Key Resources, Channels
        key_resources = self.create_bmc_box(
            "Key Resources",
            ["Gigafactories", "Patents", "Brand"],
            BLUE,
            [-3.75, -0.5, 0],
            box_width,
            box_height
        )
        
        channels = self.create_bmc_box(
            "Channels",
            ["Tesla.com", "Showrooms", "App"],
            BLUE,
            [3.75, -0.5, 0],
            box_width,
            box_height
        )
        
        # Bottom row: Cost Structure, Revenue Streams
        cost_structure = self.create_bmc_box(
            "Cost Structure",
            ["Battery costs", "R&D", "CapEx", "SG&A"],
            RED,
            [-2.5, -3, 0],
            5,
            box_height
        )
        
        revenue_streams = self.create_bmc_box(
            "Revenue Streams",
            ["Vehicle sales", "Energy products", "Services", "Regulatory credits"],
            GREEN,
            [2.5, -3, 0],
            5,
            box_height
        )
        
        # Animate all boxes sequentially
        all_boxes = [
            value_prop,  # Start with value prop (center)
            customer_seg, customer_rel, channels,  # Customer-facing
            key_activities, key_resources, key_partners,  # Backend
            revenue_streams, cost_structure  # Economics
        ]
        
        for box in all_boxes:
            self.play(Create(box[0]), Write(box[1]), run_time=0.8)
            self.wait(0.3)
        
        # Highlight value prop → customer segments connection
        arrow = Arrow(
            value_prop[0].get_right(),
            customer_seg[0].get_left(),
            color=YELLOW,
            stroke_width=6
        )
        self.play(GrowArrow(arrow))
        self.wait(1)
        self.play(FadeOut(arrow))
        
        self.wait(2)
        self.play(*[FadeOut(mob) for mob in self.mobjects])
    
    def create_bmc_box(self, heading, items, color, position, width, height):
        """Helper to create a BMC component box"""
        box = Rectangle(
            width=width,
            height=height,
            fill_color=color,
            fill_opacity=0.2,
            stroke_color=color,
            stroke_width=2
        )
        box.move_to(position)
        
        heading_text = Text(heading, font_size=20, color=color, weight=BOLD)
        heading_text.move_to(box.get_top() + DOWN * 0.3)
        
        items_text = VGroup(
            *[Text(f"• {item}", font_size=14, color=WHITE) for item in items]
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.1)
        items_text.move_to(box.get_center() + DOWN * 0.2)
        
        content = VGroup(heading_text, items_text)
        
        return VGroup(box, content)
```

### 2.4 Comparable Companies Table

**Comps Animation**
```python
from manim import *

class ComparableCompaniesSHOP(Scene):
    """
    Animates comparable companies analysis for Shopify
    Shows peer selection, multiple calculation, and valuation range
    """
    def construct(self):
        title = Text("Comparable Companies: Shopify", font_size=44, color=BLUE)
        title.to_edge(UP)
        self.play(Write(title))
        
        # Table headers
        headers = ["Company", "EV ($B)", "Revenue ($B)", "EV/Revenue", "Weight"]
        col_widths = [2, 1.5, 1.5, 1.5, 1]
        
        # Data
        comps_data = [
            ("Shopify (Target)", 85, 7.1, "?", "-"),
            ("Square", 45, 21.9, "2.1x", "25%"),
            ("PayPal", 78, 29.8, "2.6x", "20%"),
            ("Stripe", 95, 16.5, "5.8x", "30%"),
            ("Adyen", 52, 8.9, "5.8x", "25%"),
        ]
        
        # Create table
        table = self.create_table(headers, comps_data, col_widths)
        table.move_to(ORIGIN)
        
        self.play(Create(table), run_time=2)
        self.wait(1)
        
        # Highlight multiples column
        multiples = [2.1, 2.6, 5.8, 5.8]
        weights = [0.25, 0.20, 0.30, 0.25]
        
        # Calculate weighted average
        weighted_avg = sum(m * w for m, w in zip(multiples, weights))
        
        # Show calculation
        calc_box = Rectangle(
            width=8,
            height=2,
            fill_color=BLACK,
            fill_opacity=0.9,
            stroke_color=YELLOW,
            stroke_width=3
        )
        calc_box.to_edge(DOWN, buff=0.5)
        
        calc_text = VGroup(
            Text("Weighted Average EV/Revenue Multiple", font_size=28, color=YELLOW),
            MathTex(
                r"= 2.1 \times 0.25 + 2.6 \times 0.20 + 5.8 \times 0.30 + 5.8 \times 0.25",
                font_size=24,
                color=WHITE
            ),
            MathTex(
                rf"= {weighted_avg:.2f}x",
                font_size=36,
                color=GREEN,
                weight=BOLD
            )
        ).arrange(DOWN, buff=0.3)
        calc_text.move_to(calc_box.get_center())
        
        self.play(Create(calc_box), Write(calc_text), run_time=2)
        self.wait(2)
        
        # Apply to Shopify
        shopify_ev = 7.1 * weighted_avg
        
        result_box = Rectangle(
            width=6,
            height=1.5,
            fill_color=GOLD,
            fill_opacity=0.3,
            stroke_color=GOLD,
            stroke_width=4
        )
        result_box.to_corner(DR, buff=0.5)
        
        result_text = VGroup(
            Text("Shopify Implied EV", font_size=28, color=WHITE),
            Text(f"${shopify_ev:.1f}B", font_size=42, color=GOLD, weight=BOLD)
        ).arrange(DOWN, buff=0.2)
        result_text.move_to(result_box.get_center())
        
        self.play(Create(result_box), Write(result_text), run_time=1.5)
        self.wait(3)
        
        self.play(*[FadeOut(mob) for mob in self.mobjects])
    
    def create_table(self, headers, data, col_widths):
        """Helper to create a financial table"""
        rows = [headers] + data
        table = VGroup()
        
        for i, row in enumerate(rows):
            row_group = VGroup()
            x_offset = -sum(col_widths) / 2
            
            for j, (cell, width) in enumerate(zip(row, col_widths)):
                cell_box = Rectangle(
                    width=width,
                    height=0.5,
                    stroke_color=WHITE,
                    stroke_width=1,
                    fill_color=BLUE if i == 0 else BLACK,
                    fill_opacity=0.5 if i == 0 else 0.2
                )
                cell_box.shift(RIGHT * (x_offset + width / 2))
                
                cell_text = Text(
                    str(cell),
                    font_size=16 if i == 0 else 14,
                    color=YELLOW if i == 0 else WHITE,
                    weight=BOLD if i == 0 else NORMAL
                )
                cell_text.move_to(cell_box.get_center())
                
                row_group.add(VGroup(cell_box, cell_text))
                x_offset += width
            
            row_group.shift(DOWN * i * 0.5)
            table.add(row_group)
        
        return table
```

## 3) Animation Integration with Student App

### 3.1 Backend API Endpoints

```python
# src/api/learning/animations.py
from fastapi import APIRouter, Depends, HTTPException
from src.api.auth import require_auth
from src.api.learning.animations.renderers import render_animation, get_cached_animation
import os

router = APIRouter(prefix="/api/learning/animations", tags=["learning-animations"])

@router.get("/{lesson_id}/{company_ticker}")
async def get_lesson_animation(
    lesson_id: str,
    company_ticker: str,
    user=Depends(require_auth)
):
    """
    Returns signed URL to animation video for a specific lesson and company
    Animations are pre-rendered or rendered on-demand with caching
    """
    # Check cache first
    cached_path = get_cached_animation(lesson_id, company_ticker)
    if cached_path and os.path.exists(cached_path):
        return {
            "video_url": f"/uploads/learning-animations/{company_ticker}/{lesson_id}.mp4",
            "format": "mp4",
            "duration_seconds": 120  # from metadata
        }
    
    # Render on-demand (background task)
    animation_path = await render_animation(lesson_id, company_ticker)
    
    return {
        "video_url": f"/uploads/learning-animations/{company_ticker}/{lesson_id}.mp4",
        "format": "mp4",
        "duration_seconds": 120
    }

@router.post("/render-batch")
async def render_batch_animations(
    company_ticker: str,
    user=Depends(require_partner_access)  # Admin only
):
    """
    Pre-renders all animations for a company (triggered after data ingestion)
    Runs as background job
    """
    from src.api.learning.animations.batch import render_all_company_animations
    
    task_id = await render_all_company_animations(company_ticker)
    return {"task_id": task_id, "status": "rendering"}
```

### 3.2 Frontend Integration (Next.js 15)

```typescript
// apps/student/src/components/learning/AnimatedLesson.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

interface AnimatedLessonProps {
  lessonId: string;
  companyTicker: string;
  title: string;
  description: string;
}

export function AnimatedLesson({ 
  lessonId, 
  companyTicker, 
  title, 
  description 
}: AnimatedLessonProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnimation() {
      try {
        const res = await fetch(
          `/api/learning/animations/${lessonId}/${companyTicker}`
        );
        const data = await res.json();
        setVideoUrl(data.video_url);
      } catch (error) {
        console.error('Failed to load animation:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnimation();
  }, [lessonId, companyTicker]);

  return (
    <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-800">
      <h3 className="text-2xl font-bold text-blue-400 mb-2">{title}</h3>
      <p className="text-slate-300 mb-4">{description}</p>
      
      {loading ? (
        <div className="w-full h-[500px] bg-slate-800 animate-pulse rounded-lg flex items-center justify-center">
          <span className="text-slate-400">Rendering animation...</span>
        </div>
      ) : videoUrl ? (
        <video 
          className="w-full h-auto rounded-lg shadow-2xl"
          controls
          autoPlay
          loop
        >
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      ) : (
        <div className="w-full h-[500px] bg-red-900/20 rounded-lg flex items-center justify-center">
          <span className="text-red-400">Failed to load animation</span>
        </div>
      )}
      
      <div className="mt-4 flex gap-2">
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-medium">
          Replay
        </button>
        <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm font-medium">
          Next Lesson
        </button>
      </div>
    </Card>
  );
}
```

## 4) Animation Catalog by Module

**Total: 40 Animations | ~250 minutes of content**

### Business Foundations (9 animations)
1. **BMC_Systems_Thinking** - Feedback loops and value flows (5 min)
2. **BMC_Interactive_TSLA** - Tesla's full Business Model Canvas (8 min)
3. **BMC_Interactive_ABNB** - Airbnb's marketplace dynamics (7 min)
4. **Unit_Economics_CLV_CAC** - Customer lifetime value calculation (6 min)
5. **Cohort_Retention_SHOP** - Shopify merchant cohorts (5 min)
6. **Porters_5_Forces_UBER** - Competitive forces visualization (8 min)
7. **7_Moats_DE** - Deere's competitive moats (7 min)
8. **Pricing_Elasticity_Sim** - Interactive price elasticity (5 min)
9. **Expected_Value_TSLA** - Cybertruck launch EV tree (6 min)

### Accounting (12 animations)
10. **3_Statement_Linkage** - How IS/BS/CF connect (10 min)
11. **Revenue_Recognition_BUD** - AB InBev revenue types (6 min)
12. **WC_Cycle_UBER** - Working capital circular flow (7 min)
13. **Cash_Flow_Indirect_Method** - CF from operations buildup (8 min)
14. **PPE_Roll_TSLA** - PP&E and depreciation schedule (6 min)
15. **Lease_Accounting_COST** - Costco lease capitalization (7 min)
16. **Stock_Comp_SHOP** - Stock-based compensation flow (6 min)
17. **Deferred_Taxes_GE** - Timing differences visualization (7 min)
18. **Contribution_Margin_ABNB** - Unit economics breakdown (5 min)
19. **Budget_vs_Actuals** - Variance analysis waterfall (6 min)
20. **Job_Costing_DE** - Manufacturing cost flows (7 min)
21. **ABC_Costing_COST** - Activity-based costing (6 min)

### Finance & Valuation (18 animations)
22. **Revenue_Drivers_TSLA** - Q × P buildup (7 min)
23. **Revenue_Drivers_COST** - Membership + Merchandise model (6 min)
24. **Revenue_Drivers_SHOP** - GMV × Take-rate + Subscriptions (7 min)
25. **WC_Schedule_UBER** - Working capital bridge (6 min)
26. **Debt_Schedule_TSLA** - Debt rollforward with interest (7 min)
27. **WACC_Calculation_Tree** - Cost of equity + debt (8 min)
28. **DCF_Waterfall_COST** - Full DCF flow (12 min)
29. **DCF_Terminal_Value_Methods** - Gordon Growth vs. Exit Multiple (7 min)
30. **Sensitivity_Analysis_2Way** - Price target sensitivity table (6 min)
31. **Comps_Table_SHOP** - Comparable companies build (8 min)
32. **EV_Bridge_Calculation** - Market cap to enterprise value (6 min)
33. **Football_Field_Chart** - Valuation triangulation (7 min)
34. **Precedent_Transactions_ABNB** - M&A deal multiples (8 min)
35. **LBO_Returns_Waterfall** - Leveraged buyout mechanics from entry to exit (10 min)
36. **Debt_Paydown_Schedule** - Debt tranches and cash sweep mechanics (7 min)
37. **IRR_Multiple_Bridge** - LBO value creation sources breakdown (8 min)
38. **Credit_Analysis_GSBD** - Interest coverage, leverage ratios, default risk (8 min)
39. **Credit_Spread_Waterfall** - Yield decomposition and risk premium (7 min)
40. **Debt_Seniority_Waterfall** - Priority in bankruptcy and recovery rates (6 min)

## 5) Rendering & Performance

### Pre-rendering Strategy
- **Company selection:** Trigger batch rendering for all 36 animations
- **Estimated time:** ~3 hours for full company animation set (parallelized)
- **Storage:** ~15GB per company (36 videos @ ~400MB each in 1080p)
- **CDN:** Serve from local `/uploads/` in V1, migrate to S3/CloudFront in V2

### On-Demand Rendering
- **Fallback:** If animation not cached, render on first student request
- **Queue:** Background job with progress tracking
- **Notification:** WebSocket update when ready

### Quality Settings
```python
# Manim configuration for NGI Learning
config.pixel_height = 1080
config.pixel_width = 1920
config.frame_rate = 30
config.background_color = "#0F172A"  # Slate-900 (matches app theme)
```

## 6) Content Authoring Workflow

### Step 1: Design Animation (Paper/Figma)
- Sketch key frames and transitions
- Identify data sources (10-K, IR decks)
- Write narration script (if adding voiceover in V2)

### Step 2: Code Manim Scene
```python
# Template structure
class [ConceptName][CompanyTicker](Scene):
    def construct(self):
        # 1. Title
        # 2. Setup (axes, objects)
        # 3. Data import
        # 4. Animation sequence
        # 5. Highlights/callouts
        # 6. Cleanup
```

### Step 3: Test Render
```bash
manim -pql src/api/learning/animations/finance/revenue_drivers.py RevenueDriversTSLA
# -p: preview
# -ql: quality low (fast iteration)
```

### Step 4: Production Render
```bash
manim -pqh src/api/learning/animations/finance/revenue_drivers.py RevenueDriversTSLA
# -qh: quality high (1080p)
```

### Step 5: Add to Lesson Content
Update `learning_content` table with animation metadata:
```json
{
  "lesson_id": "finance_revenue_drivers_tsla",
  "animation": {
    "scene_class": "RevenueDriversTSLA",
    "module_path": "src.api.learning.animations.finance.revenue_drivers",
    "duration_seconds": 420,
    "key_concepts": ["Q x P", "revenue buildup", "ASP trends"],
    "data_sources": ["TSLA 10-K 2024", "IR Q4 2024 Update"]
  }
}
```

## 7) Interactive Elements (V2 Roadmap)

While V1 focuses on video animations, V2 will add interactive Manim-powered components:

- **Live sliders:** Adjust WACC inputs, see DCF update in real-time
- **Click-through buildups:** Click to reveal next layer of revenue model
- **Hypothesis testing:** Students input assumptions, see animation adapt
- **Code-along:** Side-by-side Manim code with live preview

## 8) Accessibility & Captions

- **Auto-generated captions:** Using Whisper API for all animations
- **Transcript:** Full text transcript stored in `learning_content`
- **Audio descriptions:** V2 feature for screen reader users
- **Playback speed:** 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x controls

## 9) Success Metrics

- **Engagement:** % of students who watch >75% of animation
- **Comprehension:** Quiz scores before/after animation
- **Completion:** % of students who complete animated lessons vs. text-only
- **Feedback:** Student ratings on animation quality and clarity

## 10) References & Resources

- **Manim Community Docs:** https://docs.manim.community/
- **3Blue1Brown YouTube:** https://www.youtube.com/@3blue1brown
- **Grant Sanderson Blog:** https://www.3blue1brown.com/blog
- **Manim Examples:** https://docs.manim.community/en/stable/examples.html
- **Financial Visualization Inspiration:** Wall Street Prep, Breaking Into Wall Street, Macabacus

---

**This approach transforms NGI Learning into a world-class, visually engaging financial education platform that rivals the best math education content online, while staying focused on practical banker-grade skills.**

