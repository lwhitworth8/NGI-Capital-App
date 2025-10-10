"""
DCF Valuation Model - Manim Scene
=================================

This scene demonstrates the Discounted Cash Flow (DCF) valuation methodology
with animated calculations and visual representations.

Author: NGI Capital Learning Team
"""

from manim import *
import numpy as np

class DCFValuationScene(Scene):
    def construct(self):
        # Set up the scene
        self.camera.background_color = "#1a1a1a"
        
        # Title
        title = Text("DCF Valuation Model", font_size=48, color=WHITE)
        title.to_edge(UP, buff=0.5)
        self.play(Write(title))
        
        # Create the DCF model components
        components = self.create_dcf_components()
        
        # Animate the components appearing
        self.animate_components(components)
        
        # Show the calculation flow
        self.animate_calculation_flow(components)
        
        # Demonstrate terminal value calculation
        self.animate_terminal_value(components)
        
        # Show final valuation
        self.animate_final_valuation(components)
        
        self.wait(2)

    def create_dcf_components(self):
        """Create the main DCF model components"""
        components = {}
        
        # Projections section
        projections = self.create_projections_section()
        projections.move_to(LEFT * 4 + UP * 1)
        components["projections"] = projections
        
        # Discounting section
        discounting = self.create_discounting_section()
        discounting.move_to(RIGHT * 4 + UP * 1)
        components["discounting"] = discounting
        
        # Terminal value section
        terminal_value = self.create_terminal_value_section()
        terminal_value.move_to(UP * 3)
        components["terminal_value"] = terminal_value
        
        # Final valuation
        final_valuation = self.create_final_valuation_section()
        final_valuation.move_to(DOWN * 2)
        components["final_valuation"] = final_valuation
        
        return components

    def create_projections_section(self):
        """Create the cash flow projections section"""
        # Container
        container = Rectangle(
            width=3.5,
            height=4,
            color=BLUE,
            fill_opacity=0.1
        )
        
        # Title
        title = Text("Cash Flow Projections", font_size=18, color=WHITE)
        title.move_to(container.get_top() + DOWN * 0.3)
        
        # Years
        years = VGroup()
        for i in range(5):
            year_text = Text(f"Year {i+1}", font_size=14, color=WHITE)
            year_text.move_to(container.get_center() + UP * (1.5 - i * 0.6) + LEFT * 1)
            years.add(year_text)
        
        # Cash flows
        cash_flows = VGroup()
        cf_values = [100, 120, 140, 160, 180]  # Example values
        for i, cf in enumerate(cf_values):
            cf_text = Text(f"${cf}M", font_size=14, color=GREEN)
            cf_text.move_to(container.get_center() + UP * (1.5 - i * 0.6) + RIGHT * 0.5)
            cash_flows.add(cf_text)
        
        return VGroup(container, title, years, cash_flows)

    def create_discounting_section(self):
        """Create the discounting section"""
        # Container
        container = Rectangle(
            width=3.5,
            height=4,
            color=GREEN,
            fill_opacity=0.1
        )
        
        # Title
        title = Text("Present Value Calculation", font_size=18, color=WHITE)
        title.move_to(container.get_top() + DOWN * 0.3)
        
        # WACC
        wacc_text = Text("WACC: 10%", font_size=16, color=YELLOW)
        wacc_text.move_to(container.get_center() + UP * 1.5)
        
        # Discounted cash flows
        discounted_cfs = VGroup()
        cf_values = [100, 120, 140, 160, 180]
        wacc = 0.10
        
        for i, cf in enumerate(cf_values):
            pv = cf / ((1 + wacc) ** (i + 1))
            pv_text = Text(f"${pv:.1f}M", font_size=14, color=GREEN)
            pv_text.move_to(container.get_center() + UP * (1.2 - i * 0.6) + RIGHT * 0.5)
            discounted_cfs.add(pv_text)
        
        # Formula
        formula = Text("PV = CF / (1 + WACC)^n", font_size=12, color=WHITE)
        formula.move_to(container.get_center() + DOWN * 1.5)
        
        return VGroup(container, title, wacc_text, discounted_cfs, formula)

    def create_terminal_value_section(self):
        """Create the terminal value section"""
        # Container
        container = Rectangle(
            width=6,
            height=2,
            color=ORANGE,
            fill_opacity=0.1
        )
        
        # Title
        title = Text("Terminal Value Calculation", font_size=18, color=WHITE)
        title.move_to(container.get_top() + DOWN * 0.3)
        
        # Formula
        formula = Text("TV = CF5 × (1 + g) / (WACC - g)", font_size=14, color=WHITE)
        formula.move_to(container.get_center() + UP * 0.3)
        
        # Values
        cf5 = 180
        growth_rate = 0.03
        wacc = 0.10
        tv = cf5 * (1 + growth_rate) / (wacc - growth_rate)
        
        values = Text(f"TV = ${cf5}M × 1.03 / (0.10 - 0.03) = ${tv:.0f}M", font_size=12, color=YELLOW)
        values.move_to(container.get_center() + DOWN * 0.3)
        
        return VGroup(container, title, formula, values)

    def create_final_valuation_section(self):
        """Create the final valuation section"""
        # Container
        container = Rectangle(
            width=8,
            height=2,
            color=YELLOW,
            fill_opacity=0.1
        )
        
        # Title
        title = Text("Enterprise Value Calculation", font_size=18, color=WHITE)
        title.move_to(container.get_top() + DOWN * 0.3)
        
        # Calculation
        pv_cfs = sum([100/(1.1**1), 120/(1.1**2), 140/(1.1**3), 160/(1.1**4), 180/(1.1**5)])
        tv = 180 * 1.03 / (0.10 - 0.03)
        pv_tv = tv / (1.1**5)
        ev = pv_cfs + pv_tv
        
        calculation = Text(
            f"PV of CFs: ${pv_cfs:.0f}M + PV of TV: ${pv_tv:.0f}M = EV: ${ev:.0f}M",
            font_size=14,
            color=GREEN
        )
        calculation.move_to(container.get_center())
        
        return VGroup(container, title, calculation)

    def animate_components(self, components):
        """Animate the components appearing"""
        # Animate each component appearing
        for component in components.values():
            self.play(FadeIn(component))
            self.wait(0.5)

    def animate_calculation_flow(self, components):
        """Animate the flow of calculations"""
        # Create arrows showing the flow
        arrow1 = Arrow(
            components["projections"].get_right(),
            components["discounting"].get_left(),
            color=WHITE,
            stroke_width=3
        )
        
        arrow2 = Arrow(
            components["projections"].get_top(),
            components["terminal_value"].get_bottom(),
            color=WHITE,
            stroke_width=3
        )
        
        arrow3 = Arrow(
            components["discounting"].get_bottom(),
            components["final_valuation"].get_top() + LEFT * 2,
            color=WHITE,
            stroke_width=3
        )
        
        arrow4 = Arrow(
            components["terminal_value"].get_bottom(),
            components["final_valuation"].get_top() + RIGHT * 2,
            color=WHITE,
            stroke_width=3
        )
        
        # Animate arrows
        self.play(Create(arrow1))
        self.wait(0.5)
        self.play(Create(arrow2))
        self.wait(0.5)
        self.play(Create(arrow3))
        self.wait(0.5)
        self.play(Create(arrow4))

    def animate_terminal_value(self, components):
        """Animate the terminal value calculation"""
        # Highlight the terminal value section
        tv_highlight = Rectangle(
            width=6.2,
            height=2.2,
            color=ORANGE,
            stroke_width=4
        )
        tv_highlight.move_to(components["terminal_value"].get_center())
        
        self.play(Create(tv_highlight))
        self.wait(1)
        self.play(FadeOut(tv_highlight))
        
        # Show the growth assumption
        growth_text = Text("Assumption: 3% perpetual growth", font_size=16, color=YELLOW)
        growth_text.move_to(components["terminal_value"].get_center() + DOWN * 1.5)
        
        self.play(Write(growth_text))
        self.wait(1)
        self.play(FadeOut(growth_text))

    def animate_final_valuation(self, components):
        """Animate the final valuation result"""
        # Highlight the final valuation
        final_highlight = Rectangle(
            width=8.2,
            height=2.2,
            color=YELLOW,
            stroke_width=4
        )
        final_highlight.move_to(components["final_valuation"].get_center())
        
        self.play(Create(final_highlight))
        
        # Add pulsing effect
        for _ in range(3):
            self.play(
                components["final_valuation"].animate.scale(1.05),
                run_time=0.3
            )
            self.play(
                components["final_valuation"].animate.scale(1/1.05),
                run_time=0.3
            )
        
        self.play(FadeOut(final_highlight))
        
        # Show sensitivity analysis
        sensitivity_text = Text(
            "Sensitivity: WACC ±1% = EV ±$50M",
            font_size=14,
            color=WHITE
        )
        sensitivity_text.move_to(components["final_valuation"].get_center() + DOWN * 1.5)
        
        self.play(Write(sensitivity_text))
        self.wait(1)
        self.play(FadeOut(sensitivity_text))
