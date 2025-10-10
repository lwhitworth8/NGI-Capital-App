"""
Working Capital Analysis - Manim Scene
======================================

This scene demonstrates working capital analysis and its impact on cash flow,
including the cash conversion cycle and working capital optimization.

Author: NGI Capital Learning Team
"""

from manim import *
import numpy as np

class WorkingCapitalAnalysisScene(Scene):
    def construct(self):
        # Set up the scene
        self.camera.background_color = "#1a1a1a"
        
        # Title
        title = Text("Working Capital Analysis", font_size=48, color=WHITE)
        title.to_edge(UP, buff=0.5)
        self.play(Write(title))
        
        # Create the working capital components
        components = self.create_working_capital_components()
        
        # Animate the components appearing
        self.animate_components(components)
        
        # Show the cash conversion cycle
        self.animate_cash_conversion_cycle(components)
        
        # Demonstrate working capital optimization
        self.animate_optimization(components)
        
        # Show impact on cash flow
        self.animate_cash_flow_impact(components)
        
        self.wait(2)

    def create_working_capital_components(self):
        """Create the working capital components"""
        components = {}
        
        # Current Assets
        current_assets = self.create_current_assets_section()
        current_assets.move_to(LEFT * 4 + UP * 1)
        components["current_assets"] = current_assets
        
        # Current Liabilities
        current_liabilities = self.create_current_liabilities_section()
        current_liabilities.move_to(RIGHT * 4 + UP * 1)
        components["current_liabilities"] = current_liabilities
        
        # Working Capital
        working_capital = self.create_working_capital_section()
        working_capital.move_to(UP * 3)
        components["working_capital"] = working_capital
        
        # Cash Conversion Cycle
        ccc = self.create_cash_conversion_cycle()
        ccc.move_to(DOWN * 1)
        components["ccc"] = ccc
        
        return components

    def create_current_assets_section(self):
        """Create the current assets section"""
        # Container
        container = Rectangle(
            width=3.5,
            height=4,
            color=GREEN,
            fill_opacity=0.1
        )
        
        # Title
        title = Text("Current Assets", font_size=18, color=WHITE)
        title.move_to(container.get_top() + DOWN * 0.3)
        
        # Cash
        cash = Text("Cash: $500M", font_size=14, color=WHITE)
        cash.move_to(container.get_center() + UP * 1.5)
        
        # Accounts Receivable
        ar = Text("A/R: $300M", font_size=14, color=WHITE)
        ar.move_to(container.get_center() + UP * 1.0)
        
        # Inventory
        inventory = Text("Inventory: $200M", font_size=14, color=WHITE)
        inventory.move_to(container.get_center() + UP * 0.5)
        
        # Prepaid Expenses
        prepaid = Text("Prepaid: $50M", font_size=14, color=WHITE)
        prepaid.move_to(container.get_center())
        
        # Total
        total_assets = Text("Total: $1,050M", font_size=16, color=YELLOW)
        total_assets.move_to(container.get_center() + DOWN * 1.0)
        
        return VGroup(container, title, cash, ar, inventory, prepaid, total_assets)

    def create_current_liabilities_section(self):
        """Create the current liabilities section"""
        # Container
        container = Rectangle(
            width=3.5,
            height=4,
            color=RED,
            fill_opacity=0.1
        )
        
        # Title
        title = Text("Current Liabilities", font_size=18, color=WHITE)
        title.move_to(container.get_top() + DOWN * 0.3)
        
        # Accounts Payable
        ap = Text("A/P: $150M", font_size=14, color=WHITE)
        ap.move_to(container.get_center() + UP * 1.5)
        
        # Accrued Expenses
        accrued = Text("Accrued: $100M", font_size=14, color=WHITE)
        accrued.move_to(container.get_center() + UP * 1.0)
        
        # Short-term Debt
        std = Text("Short-term Debt: $200M", font_size=14, color=WHITE)
        std.move_to(container.get_center() + UP * 0.5)
        
        # Other Current Liabilities
        other = Text("Other: $50M", font_size=14, color=WHITE)
        other.move_to(container.get_center())
        
        # Total
        total_liabilities = Text("Total: $500M", font_size=16, color=YELLOW)
        total_liabilities.move_to(container.get_center() + DOWN * 1.0)
        
        return VGroup(container, title, ap, accrued, std, other, total_liabilities)

    def create_working_capital_section(self):
        """Create the working capital section"""
        # Container
        container = Rectangle(
            width=6,
            height=2,
            color=BLUE,
            fill_opacity=0.1
        )
        
        # Title
        title = Text("Working Capital", font_size=18, color=WHITE)
        title.move_to(container.get_top() + DOWN * 0.3)
        
        # Formula
        formula = Text("WC = Current Assets - Current Liabilities", font_size=14, color=WHITE)
        formula.move_to(container.get_center() + UP * 0.3)
        
        # Calculation
        calculation = Text("WC = $1,050M - $500M = $550M", font_size=14, color=YELLOW)
        calculation.move_to(container.get_center() + DOWN * 0.3)
        
        return VGroup(container, title, formula, calculation)

    def create_cash_conversion_cycle(self):
        """Create the cash conversion cycle section"""
        # Container
        container = Rectangle(
            width=8,
            height=3,
            color=ORANGE,
            fill_opacity=0.1
        )
        
        # Title
        title = Text("Cash Conversion Cycle", font_size=18, color=WHITE)
        title.move_to(container.get_top() + DOWN * 0.3)
        
        # Days components
        days_sales_outstanding = Text("DSO: 30 days", font_size=14, color=WHITE)
        days_sales_outstanding.move_to(container.get_center() + UP * 0.8 + LEFT * 2)
        
        days_inventory_outstanding = Text("DIO: 45 days", font_size=14, color=WHITE)
        days_inventory_outstanding.move_to(container.get_center() + UP * 0.8)
        
        days_payable_outstanding = Text("DPO: 25 days", font_size=14, color=WHITE)
        days_payable_outstanding.move_to(container.get_center() + UP * 0.8 + RIGHT * 2)
        
        # CCC calculation
        ccc_formula = Text("CCC = DSO + DIO - DPO", font_size=14, color=WHITE)
        ccc_formula.move_to(container.get_center() + UP * 0.2)
        
        ccc_calculation = Text("CCC = 30 + 45 - 25 = 50 days", font_size=14, color=YELLOW)
        ccc_calculation.move_to(container.get_center() + DOWN * 0.4)
        
        # Interpretation
        interpretation = Text("Company takes 50 days to convert investments to cash", font_size=12, color=WHITE)
        interpretation.move_to(container.get_center() + DOWN * 1.0)
        
        return VGroup(
            container, title, days_sales_outstanding, days_inventory_outstanding,
            days_payable_outstanding, ccc_formula, ccc_calculation, interpretation
        )

    def animate_components(self, components):
        """Animate the components appearing"""
        # Animate each component appearing
        for component in components.values():
            self.play(FadeIn(component))
            self.wait(0.5)

    def animate_cash_conversion_cycle(self, components):
        """Animate the cash conversion cycle"""
        # Highlight the CCC section
        ccc_highlight = Rectangle(
            width=8.2,
            height=3.2,
            color=ORANGE,
            stroke_width=4
        )
        ccc_highlight.move_to(components["ccc"].get_center())
        
        self.play(Create(ccc_highlight))
        self.wait(1)
        self.play(FadeOut(ccc_highlight))
        
        # Show the flow of cash
        cash_flow_arrow = Arrow(
            components["current_assets"].get_bottom(),
            components["ccc"].get_top(),
            color=WHITE,
            stroke_width=3
        )
        
        self.play(Create(cash_flow_arrow))
        self.wait(0.5)
        self.play(FadeOut(cash_flow_arrow))

    def animate_optimization(self, components):
        """Animate working capital optimization"""
        # Show optimization strategies
        optimization_text = Text(
            "Optimization Strategies:",
            font_size=16,
            color=WHITE
        )
        optimization_text.move_to(DOWN * 3.5)
        
        strategies = [
            "• Reduce DSO through better collections",
            "• Optimize inventory levels",
            "• Extend DPO with suppliers",
            "• Improve cash management"
        ]
        
        strategy_texts = VGroup()
        for i, strategy in enumerate(strategies):
            strategy_text = Text(strategy, font_size=12, color=WHITE)
            strategy_text.move_to(DOWN * 4.5 + LEFT * 3 + RIGHT * i * 1.5)
            strategy_texts.add(strategy_text)
        
        self.play(Write(optimization_text))
        self.play(*[Write(strategy) for strategy in strategy_texts])
        
        # Show impact
        impact_text = Text(
            "Target: Reduce CCC from 50 to 30 days",
            font_size=14,
            color=YELLOW
        )
        impact_text.move_to(DOWN * 5.5)
        
        self.play(Write(impact_text))
        self.wait(1)
        
        # Clean up
        self.play(
            FadeOut(optimization_text),
            FadeOut(strategy_texts),
            FadeOut(impact_text)
        )

    def animate_cash_flow_impact(self, components):
        """Animate the impact on cash flow"""
        # Show cash flow impact
        impact_text = Text(
            "Cash Flow Impact:",
            font_size=16,
            color=WHITE
        )
        impact_text.move_to(DOWN * 3.5)
        
        # Positive impact
        positive_impact = Text(
            "Reducing CCC by 20 days = $30M additional cash",
            font_size=14,
            color=GREEN
        )
        positive_impact.move_to(DOWN * 4.2)
        
        # Negative impact
        negative_impact = Text(
            "Increasing CCC by 20 days = $30M cash drain",
            font_size=14,
            color=RED
        )
        negative_impact.move_to(DOWN * 4.9)
        
        self.play(Write(impact_text))
        self.play(Write(positive_impact))
        self.wait(0.5)
        self.play(Write(negative_impact))
        
        # Highlight the working capital
        wc_highlight = Rectangle(
            width=6.2,
            height=2.2,
            color=BLUE,
            stroke_width=4
        )
        wc_highlight.move_to(components["working_capital"].get_center())
        
        self.play(Create(wc_highlight))
        self.wait(1)
        self.play(FadeOut(wc_highlight))
        
        # Clean up
        self.play(
            FadeOut(impact_text),
            FadeOut(positive_impact),
            FadeOut(negative_impact)
        )
