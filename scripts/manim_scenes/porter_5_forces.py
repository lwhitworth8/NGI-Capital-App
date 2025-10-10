"""
Porter's 5 Forces Analysis - Manim Scene
========================================

This scene demonstrates Michael Porter's Five Forces framework for
analyzing competitive intensity and industry attractiveness.

Author: NGI Capital Learning Team
"""

from manim import *
import numpy as np

class PorterFiveForcesScene(Scene):
    def construct(self):
        # Set up the scene
        self.camera.background_color = "#1a1a1a"
        
        # Title
        title = Text("Porter's Five Forces Analysis", font_size=48, color=WHITE)
        title.to_edge(UP, buff=0.5)
        self.play(Write(title))
        
        # Create the five forces diagram
        forces = self.create_five_forces_diagram()
        
        # Animate each force appearing
        self.animate_forces_appearing(forces)
        
        # Show competitive intensity
        self.animate_competitive_intensity(forces)
        
        # Highlight industry attractiveness
        self.analyze_industry_attractiveness(forces)
        
        self.wait(2)

    def create_five_forces_diagram(self):
        """Create the five forces diagram"""
        forces = {}
        
        # Central industry circle
        industry_circle = Circle(
            radius=1.5,
            color=YELLOW,
            fill_opacity=0.2,
            stroke_width=3
        )
        industry_circle.move_to(ORIGIN)
        
        industry_label = Text("Industry\nCompetition", font_size=16, color=WHITE)
        industry_label.move_to(industry_circle.get_center())
        
        forces["industry"] = VGroup(industry_circle, industry_label)
        
        # Threat of New Entrants (Top)
        new_entrants = self.create_force_arrow(
            "Threat of\nNew Entrants",
            UP * 3,
            DOWN,
            RED,
            "HIGH" if np.random.random() > 0.5 else "LOW"
        )
        forces["new_entrants"] = new_entrants
        
        # Bargaining Power of Suppliers (Left)
        suppliers = self.create_force_arrow(
            "Bargaining Power\nof Suppliers",
            LEFT * 3,
            RIGHT,
            ORANGE,
            "HIGH" if np.random.random() > 0.5 else "LOW"
        )
        forces["suppliers"] = suppliers
        
        # Bargaining Power of Buyers (Right)
        buyers = self.create_force_arrow(
            "Bargaining Power\nof Buyers",
            RIGHT * 3,
            LEFT,
            BLUE,
            "HIGH" if np.random.random() > 0.5 else "LOW"
        )
        forces["buyers"] = buyers
        
        # Threat of Substitutes (Bottom Left)
        substitutes = self.create_force_arrow(
            "Threat of\nSubstitutes",
            DOWN * 3 + LEFT * 1.5,
            UP + RIGHT * 0.5,
            PURPLE,
            "HIGH" if np.random.random() > 0.5 else "LOW"
        )
        forces["substitutes"] = substitutes
        
        # Competitive Rivalry (Bottom Right)
        rivalry = self.create_force_arrow(
            "Competitive\nRivalry",
            DOWN * 3 + RIGHT * 1.5,
            UP + LEFT * 0.5,
            GREEN,
            "HIGH" if np.random.random() > 0.5 else "LOW"
        )
        forces["rivalry"] = rivalry
        
        return forces

    def create_force_arrow(self, title, position, direction, color, intensity):
        """Create a force arrow with title and intensity indicator"""
        # Arrow
        arrow = Arrow(
            position + direction * 0.5,
            position - direction * 0.5,
            color=color,
            stroke_width=4,
            max_tip_length_to_length_ratio=0.2
        )
        
        # Title
        title_text = Text(title, font_size=14, color=WHITE)
        title_text.move_to(position + direction * 1.2)
        
        # Intensity indicator
        intensity_color = RED if intensity == "HIGH" else GREEN
        intensity_circle = Circle(
            radius=0.3,
            color=intensity_color,
            fill_opacity=0.7
        )
        intensity_circle.move_to(position - direction * 1.2)
        
        intensity_text = Text(intensity, font_size=12, color=WHITE)
        intensity_text.move_to(intensity_circle.get_center())
        
        return VGroup(arrow, title_text, intensity_circle, intensity_text)

    def animate_forces_appearing(self, forces):
        """Animate each force appearing in sequence"""
        # Start with industry
        self.play(FadeIn(forces["industry"]))
        
        # Animate each force appearing
        force_order = ["new_entrants", "suppliers", "buyers", "substitutes", "rivalry"]
        
        for i, force_key in enumerate(force_order):
            self.play(
                FadeIn(forces[force_key]),
                run_time=0.8
            )
            self.wait(0.3)

    def animate_competitive_intensity(self, forces):
        """Show competitive intensity through visual effects"""
        # Create pulsing effect for high-intensity forces
        high_intensity_forces = []
        
        for force_key, force_group in forces.items():
            if force_key == "industry":
                continue
                
            # Check if this force has high intensity
            intensity_circle = force_group[2]  # The circle is the third element
            if intensity_circle.color == RED:
                high_intensity_forces.append(force_group)
        
        # Animate pulsing for high-intensity forces
        if high_intensity_forces:
            for _ in range(3):
                self.play(
                    *[force.animate.scale(1.1) for force in high_intensity_forces],
                    run_time=0.3
                )
                self.play(
                    *[force.animate.scale(1/1.1) for force in high_intensity_forces],
                    run_time=0.3
                )

    def analyze_industry_attractiveness(self, forces):
        """Analyze overall industry attractiveness"""
        # Count high vs low intensity forces
        high_count = 0
        low_count = 0
        
        for force_key, force_group in forces.items():
            if force_key == "industry":
                continue
                
            intensity_circle = force_group[2]
            if intensity_circle.color == RED:
                high_count += 1
            else:
                low_count += 1
        
        # Determine overall attractiveness
        if high_count > low_count:
            attractiveness = "LOW"
            color = RED
        else:
            attractiveness = "HIGH"
            color = GREEN
        
        # Create attractiveness indicator
        attractiveness_box = Rectangle(
            width=4,
            height=1,
            color=color,
            fill_opacity=0.3
        )
        attractiveness_box.move_to(DOWN * 5)
        
        attractiveness_text = Text(
            f"Overall Industry Attractiveness: {attractiveness}",
            font_size=20,
            color=WHITE
        )
        attractiveness_text.move_to(attractiveness_box.get_center())
        
        # Animate attractiveness analysis
        self.play(
            FadeIn(attractiveness_box),
            Write(attractiveness_text)
        )
        
        # Add explanation
        explanation = Text(
            f"High intensity forces: {high_count} | Low intensity forces: {low_count}",
            font_size=16,
            color=WHITE
        )
        explanation.move_to(attractiveness_box.get_center() + DOWN * 0.5)
        
        self.play(Write(explanation))
        
        # Highlight the central industry
        industry_highlight = Circle(
            radius=1.8,
            color=color,
            stroke_width=5
        )
        industry_highlight.move_to(forces["industry"].get_center())
        
        self.play(Create(industry_highlight))
        self.wait(1)
        self.play(FadeOut(industry_highlight))

    def create_force_arrow(self, title, position, direction, color, intensity):
        """Create a force arrow with title and intensity indicator"""
        # Arrow
        arrow = Arrow(
            position + direction * 0.5,
            position - direction * 0.5,
            color=color,
            stroke_width=4,
            max_tip_length_to_length_ratio=0.2
        )
        
        # Title
        title_text = Text(title, font_size=14, color=WHITE)
        title_text.move_to(position + direction * 1.2)
        
        # Intensity indicator
        intensity_color = RED if intensity == "HIGH" else GREEN
        intensity_circle = Circle(
            radius=0.3,
            color=intensity_color,
            fill_opacity=0.7
        )
        intensity_circle.move_to(position - direction * 1.2)
        
        intensity_text = Text(intensity, font_size=12, color=WHITE)
        intensity_text.move_to(intensity_circle.get_center())
        
        return VGroup(arrow, title_text, intensity_circle, intensity_text)
