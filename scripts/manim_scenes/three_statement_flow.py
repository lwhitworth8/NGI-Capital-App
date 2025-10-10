#!/usr/bin/env python3
"""
Three Statement Flow Animation
Shows how Income Statement, Balance Sheet, and Cash Flow Statement connect
"""

from manim import *
import numpy as np

class ThreeStatementFlow(Scene):
    def construct(self):
        # Set up the scene
        self.camera.background_color = WHITE
        
        # Title
        title = Text("Three Statement Financial Model Flow", font_size=40, color=BLACK, weight=BOLD)
        title.to_edge(UP, buff=0.5)
        self.play(Write(title))
        self.wait(1)
        
        # Create the three statements
        self.create_statements()
        self.wait(1)
        
        # Show the flow between statements
        self.show_income_to_balance()
        self.wait(1)
        self.show_balance_to_cash_flow()
        self.wait(1)
        self.show_cash_flow_to_balance()
        self.wait(1)
        
        # Show detailed line items
        self.show_detailed_flow()
        self.wait(2)
        
        # Show the circular nature
        self.show_circular_flow()
        self.wait(2)
        
        # Final summary
        self.show_summary()
        self.wait(3)

    def create_statements(self):
        """Create the three financial statements"""
        # Income Statement
        self.is_box = Rectangle(
            width=4, height=2.5, 
            color=BLUE, stroke_width=3
        ).shift(UP * 2.5)
        self.is_label = Text("Income Statement", font_size=24, color=BLACK, weight=BOLD).move_to(self.is_box)
        
        # Balance Sheet
        self.bs_box = Rectangle(
            width=4, height=2.5, 
            color=GREEN, stroke_width=3
        ).shift(ORIGIN)
        self.bs_label = Text("Balance Sheet", font_size=24, color=BLACK, weight=BOLD).move_to(self.bs_box)
        
        # Cash Flow Statement
        self.cf_box = Rectangle(
            width=4, height=2.5, 
            color=PURPLE, stroke_width=3
        ).shift(DOWN * 2.5)
        self.cf_label = Text("Cash Flow Statement", font_size=24, color=BLACK, weight=BOLD).move_to(self.cf_box)
        
        # Animate creation
        self.play(
            Create(self.is_box), Write(self.is_label),
            Create(self.bs_box), Write(self.bs_label),
            Create(self.cf_box), Write(self.cf_label),
            run_time=2
        )

    def show_income_to_balance(self):
        """Show how Income Statement flows to Balance Sheet"""
        # Highlight Income Statement
        self.play(self.is_box.animate.set_fill(BLUE, opacity=0.3))
        
        # Show key line items
        is_items = VGroup(
            Text("Revenue", font_size=16, color=BLACK),
            Text("- COGS", font_size=16, color=BLACK),
            Text("= Gross Profit", font_size=16, color=BLACK),
            Text("- Operating Expenses", font_size=16, color=BLACK),
            Text("= Net Income", font_size=16, color=BLACK, weight=BOLD)
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.1)
        is_items.next_to(self.is_box, RIGHT, buff=0.5)
        
        self.play(Write(is_items))
        self.wait(1)
        
        # Show arrow to Balance Sheet
        arrow1 = Arrow(
            self.is_box.get_bottom(), 
            self.bs_box.get_top(), 
            color=YELLOW, stroke_width=6
        )
        self.play(Create(arrow1))
        
        # Highlight Balance Sheet
        self.play(self.bs_box.animate.set_fill(GREEN, opacity=0.3))
        
        # Show retained earnings connection
        re_connection = Text("Net Income → Retained Earnings", font_size=18, color=YELLOW, weight=BOLD)
        re_connection.next_to(arrow1, RIGHT, buff=0.3)
        self.play(Write(re_connection))
        
        self.wait(1)
        self.play(FadeOut(VGroup(is_items, arrow1, re_connection)))
        self.play(
            self.is_box.animate.set_fill(WHITE, opacity=0),
            self.bs_box.animate.set_fill(WHITE, opacity=0)
        )

    def show_balance_to_cash_flow(self):
        """Show how Balance Sheet flows to Cash Flow Statement"""
        # Highlight Balance Sheet
        self.play(self.bs_box.animate.set_fill(GREEN, opacity=0.3))
        
        # Show key balance sheet items
        bs_items = VGroup(
            Text("Assets", font_size=16, color=BLACK, weight=BOLD),
            Text("• Cash", font_size=14, color=BLACK),
            Text("• Accounts Receivable", font_size=14, color=BLACK),
            Text("• Inventory", font_size=14, color=BLACK),
            Text("• PP&E", font_size=14, color=BLACK),
            Text("", font_size=8, color=BLACK),  # Spacer
            Text("Liabilities", font_size=16, color=BLACK, weight=BOLD),
            Text("• Accounts Payable", font_size=14, color=BLACK),
            Text("• Debt", font_size=14, color=BLACK),
            Text("", font_size=8, color=BLACK),  # Spacer
            Text("Equity", font_size=16, color=BLACK, weight=BOLD),
            Text("• Retained Earnings", font_size=14, color=BLACK)
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.05)
        bs_items.next_to(self.bs_box, RIGHT, buff=0.5)
        
        self.play(Write(bs_items))
        self.wait(1)
        
        # Show arrow to Cash Flow
        arrow2 = Arrow(
            self.bs_box.get_bottom(), 
            self.cf_box.get_top(), 
            color=ORANGE, stroke_width=6
        )
        self.play(Create(arrow2))
        
        # Highlight Cash Flow Statement
        self.play(self.cf_box.animate.set_fill(PURPLE, opacity=0.3))
        
        # Show cash flow sections
        cf_sections = VGroup(
            Text("Operating Activities", font_size=16, color=BLACK, weight=BOLD),
            Text("• Net Income", font_size=14, color=BLACK),
            Text("• Depreciation", font_size=14, color=BLACK),
            Text("• Working Capital Changes", font_size=14, color=BLACK),
            Text("", font_size=8, color=BLACK),
            Text("Investing Activities", font_size=16, color=BLACK, weight=BOLD),
            Text("• CapEx", font_size=14, color=BLACK),
            Text("", font_size=8, color=BLACK),
            Text("Financing Activities", font_size=16, color=BLACK, weight=BOLD),
            Text("• Debt Issuance/Repayment", font_size=14, color=BLACK),
            Text("• Equity Issuance", font_size=14, color=BLACK)
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.05)
        cf_sections.next_to(self.cf_box, RIGHT, buff=0.5)
        
        self.play(Write(cf_sections))
        
        # Show the connection
        connection = Text("Balance Sheet Changes → Cash Flow", font_size=18, color=ORANGE, weight=BOLD)
        connection.next_to(arrow2, RIGHT, buff=0.3)
        self.play(Write(connection))
        
        self.wait(1)
        self.play(FadeOut(VGroup(bs_items, arrow2, cf_sections, connection)))
        self.play(
            self.bs_box.animate.set_fill(WHITE, opacity=0),
            self.cf_box.animate.set_fill(WHITE, opacity=0)
        )

    def show_cash_flow_to_balance(self):
        """Show how Cash Flow Statement flows back to Balance Sheet"""
        # Highlight Cash Flow Statement
        self.play(self.cf_box.animate.set_fill(PURPLE, opacity=0.3))
        
        # Show arrow back to Balance Sheet
        arrow3 = Arrow(
            self.cf_box.get_top(), 
            self.bs_box.get_bottom(), 
            color=RED, stroke_width=6
        )
        self.play(Create(arrow3))
        
        # Highlight Balance Sheet
        self.play(self.bs_box.animate.set_fill(GREEN, opacity=0.3))
        
        # Show cash connection
        cash_connection = Text("Net Cash Flow → Cash Balance", font_size=18, color=RED, weight=BOLD)
        cash_connection.next_to(arrow3, LEFT, buff=0.3)
        self.play(Write(cash_connection))
        
        self.wait(1)
        self.play(FadeOut(VGroup(arrow3, cash_connection)))
        self.play(
            self.cf_box.animate.set_fill(WHITE, opacity=0),
            self.bs_box.animate.set_fill(WHITE, opacity=0)
        )

    def show_detailed_flow(self):
        """Show detailed line item flows"""
        # Create a detailed example
        example_title = Text("Example: Revenue Recognition Flow", font_size=24, color=BLACK, weight=BOLD)
        example_title.to_edge(DOWN, buff=2)
        self.play(Write(example_title))
        
        # Step 1: Revenue recognition
        step1 = VGroup(
            Text("1. Revenue Recognition (IS)", font_size=16, color=BLACK, weight=BOLD),
            Text("   Revenue: $1,000", font_size=14, color=BLACK),
            Text("   → A/R: +$1,000 (BS)", font_size=14, color=BLACK)
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.1)
        step1.next_to(example_title, UP, buff=0.5)
        
        self.play(Write(step1))
        self.wait(1)
        
        # Step 2: Cash collection
        step2 = VGroup(
            Text("2. Cash Collection (CF)", font_size=16, color=BLACK, weight=BOLD),
            Text("   Cash: +$1,000 (BS)", font_size=14, color=BLACK),
            Text("   A/R: -$1,000 (BS)", font_size=14, color=BLACK)
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.1)
        step2.next_to(step1, UP, buff=0.3)
        
        self.play(Write(step2))
        self.wait(1)
        
        # Step 3: Net income to retained earnings
        step3 = VGroup(
            Text("3. Net Income → Retained Earnings", font_size=16, color=BLACK, weight=BOLD),
            Text("   Net Income: $200 (IS)", font_size=14, color=BLACK),
            Text("   → Retained Earnings: +$200 (BS)", font_size=14, color=BLACK)
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.1)
        step3.next_to(step2, UP, buff=0.3)
        
        self.play(Write(step3))
        self.wait(2)
        
        self.play(FadeOut(VGroup(example_title, step1, step2, step3)))

    def show_circular_flow(self):
        """Show the circular nature of the three statements"""
        # Create circular arrows
        circle_arrow1 = CurvedArrow(
            self.is_box.get_right() + RIGHT * 0.5,
            self.bs_box.get_right() + RIGHT * 0.5,
            angle=TAU/4,
            color=BLUE,
            stroke_width=4
        )
        
        circle_arrow2 = CurvedArrow(
            self.bs_box.get_right() + RIGHT * 0.5,
            self.cf_box.get_right() + RIGHT * 0.5,
            angle=TAU/4,
            color=GREEN,
            stroke_width=4
        )
        
        circle_arrow3 = CurvedArrow(
            self.cf_box.get_left() + LEFT * 0.5,
            self.bs_box.get_left() + LEFT * 0.5,
            angle=TAU/4,
            color=PURPLE,
            stroke_width=4
        )
        
        circle_arrow4 = CurvedArrow(
            self.bs_box.get_left() + LEFT * 0.5,
            self.is_box.get_left() + LEFT * 0.5,
            angle=TAU/4,
            color=ORANGE,
            stroke_width=4
        )
        
        # Animate circular flow
        self.play(
            Create(circle_arrow1),
            Create(circle_arrow2),
            Create(circle_arrow3),
            Create(circle_arrow4),
            run_time=2
        )
        
        # Add circular flow label
        circular_label = Text("Circular Flow", font_size=20, color=BLACK, weight=BOLD)
        circular_label.next_to(self.bs_box, RIGHT, buff=2)
        self.play(Write(circular_label))
        
        self.wait(1)
        self.play(FadeOut(VGroup(circle_arrow1, circle_arrow2, circle_arrow3, circle_arrow4, circular_label)))

    def show_summary(self):
        """Show final summary"""
        summary = VGroup(
            Text("Three Statement Model Summary", font_size=28, color=BLACK, weight=BOLD),
            Text("• Income Statement: Shows profitability over time", font_size=18, color=BLACK),
            Text("• Balance Sheet: Shows financial position at a point in time", font_size=18, color=BLACK),
            Text("• Cash Flow Statement: Shows cash movements over time", font_size=18, color=BLACK),
            Text("• All three statements must be consistent and balanced", font_size=18, color=BLACK),
            Text("• Changes in one statement affect the others", font_size=18, color=BLACK)
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.2)
        summary.to_edge(DOWN, buff=1)
        
        self.play(Write(summary))
        self.wait(2)