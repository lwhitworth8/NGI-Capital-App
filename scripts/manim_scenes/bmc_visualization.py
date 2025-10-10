#!/usr/bin/env python3
"""
Business Model Canvas Visualization Animation
Comprehensive animation showing all 9 building blocks with detailed explanations
"""

from manim import *
import numpy as np

class BMCVisualization(Scene):
    def construct(self):
        # Set up the scene
        self.camera.background_color = WHITE
        
        # Title
        title = Text("Business Model Canvas", font_size=48, color=BLACK, weight=BOLD)
        title.to_edge(UP, buff=0.5)
        self.play(Write(title))
        self.wait(1)
        
        # Create the 9 boxes for BMC
        self.create_bmc_boxes()
        self.wait(2)
        
        # Animate each section with detailed explanations
        self.animate_customer_segments()
        self.wait(1)
        self.animate_value_propositions()
        self.wait(1)
        self.animate_channels()
        self.wait(1)
        self.animate_customer_relationships()
        self.wait(1)
        self.animate_revenue_streams()
        self.wait(1)
        self.animate_key_resources()
        self.wait(1)
        self.animate_key_activities()
        self.wait(1)
        self.animate_key_partnerships()
        self.wait(1)
        self.animate_cost_structure()
        self.wait(2)
        
        # Show connections between sections
        self.show_connections()
        self.wait(2)
        
        # Final summary
        self.show_summary()
        self.wait(3)

    def create_bmc_boxes(self):
        """Create the 9 BMC boxes in a 3x3 grid"""
        # Define box dimensions
        box_width = 2.5
        box_height = 2
        
        # Create boxes
        self.boxes = VGroup()
        self.labels = VGroup()
        
        # Box positions (3x3 grid)
        positions = [
            # Row 1: Customer Segments, Value Proposition, Channels
            [LEFT * 3.5 + UP * 2, ORIGIN + UP * 2, RIGHT * 3.5 + UP * 2],
            # Row 2: Customer Relationships, Revenue Streams, Key Resources  
            [LEFT * 3.5, ORIGIN, RIGHT * 3.5],
            # Row 3: Key Activities, Key Partnerships, Cost Structure
            [LEFT * 3.5 + DOWN * 2, ORIGIN + DOWN * 2, RIGHT * 3.5 + DOWN * 2]
        ]
        
        # Box labels
        labels_text = [
            ["Customer\nSegments", "Value\nProposition", "Channels"],
            ["Customer\nRelationships", "Revenue\nStreams", "Key\nResources"],
            ["Key\nActivities", "Key\nPartnerships", "Cost\nStructure"]
        ]
        
        # Colors for each section
        colors = [
            [BLUE, GREEN, PURPLE],
            [ORANGE, RED, YELLOW],
            [PINK, TEAL, GRAY]
        ]
        
        for i, row in enumerate(positions):
            for j, pos in enumerate(row):
                # Create box
                box = Rectangle(
                    width=box_width, 
                    height=box_height,
                    color=colors[i][j],
                    stroke_width=3
                ).move_to(pos)
                
                # Create label
                label = Text(
                    labels_text[i][j], 
                    font_size=20, 
                    color=BLACK,
                    weight=BOLD
                ).move_to(pos)
                
                self.boxes.add(box)
                self.labels.add(label)
        
        # Animate creation of all boxes
        self.play(
            *[Create(box) for box in self.boxes],
            *[Write(label) for label in self.labels],
            run_time=2
        )

    def animate_customer_segments(self):
        """Animate Customer Segments section with examples"""
        # Highlight the Customer Segments box
        customer_box = self.boxes[0]
        self.play(customer_box.animate.set_fill(BLUE, opacity=0.3))
        
        # Show examples
        examples = VGroup(
            Text("• Mass Market", font_size=16, color=BLACK),
            Text("• Niche Market", font_size=16, color=BLACK),
            Text("• Segmented Market", font_size=16, color=BLACK),
            Text("• Diversified Market", font_size=16, color=BLACK),
            Text("• Multi-sided Platform", font_size=16, color=BLACK)
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.2)
        examples.next_to(customer_box, RIGHT, buff=0.5)
        
        self.play(Write(examples))
        self.wait(1)
        self.play(FadeOut(examples))
        self.play(customer_box.animate.set_fill(WHITE, opacity=0))

    def animate_value_propositions(self):
        """Animate Value Propositions section with types"""
        value_box = self.boxes[1]
        self.play(value_box.animate.set_fill(GREEN, opacity=0.3))
        
        # Show value proposition types
        vp_types = VGroup(
            Text("• Newness", font_size=16, color=BLACK),
            Text("• Performance", font_size=16, color=BLACK),
            Text("• Customization", font_size=16, color=BLACK),
            Text("• Getting the Job Done", font_size=16, color=BLACK),
            Text("• Design", font_size=16, color=BLACK),
            Text("• Brand/Status", font_size=16, color=BLACK),
            Text("• Price", font_size=16, color=BLACK),
            Text("• Cost Reduction", font_size=16, color=BLACK),
            Text("• Risk Reduction", font_size=16, color=BLACK),
            Text("• Accessibility", font_size=16, color=BLACK)
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.1)
        vp_types.next_to(value_box, RIGHT, buff=0.5)
        
        self.play(Write(vp_types))
        self.wait(1)
        self.play(FadeOut(vp_types))
        self.play(value_box.animate.set_fill(WHITE, opacity=0))

    def animate_channels(self):
        """Animate Channels section with examples"""
        channels_box = self.boxes[2]
        self.play(channels_box.animate.set_fill(PURPLE, opacity=0.3))
        
        # Show channel types
        channel_types = VGroup(
            Text("• Direct Sales", font_size=16, color=BLACK),
            Text("• Online Platform", font_size=16, color=BLACK),
            Text("• Retail Partners", font_size=16, color=BLACK),
            Text("• Wholesale", font_size=16, color=BLACK),
            Text("• Mobile App", font_size=16, color=BLACK)
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.2)
        channel_types.next_to(channels_box, RIGHT, buff=0.5)
        
        self.play(Write(channel_types))
        self.wait(1)
        self.play(FadeOut(channel_types))
        self.play(channels_box.animate.set_fill(WHITE, opacity=0))

    def animate_customer_relationships(self):
        """Animate Customer Relationships section"""
        relationships_box = self.boxes[3]
        self.play(relationships_box.animate.set_fill(ORANGE, opacity=0.3))
        
        # Show relationship types
        rel_types = VGroup(
            Text("• Personal Assistance", font_size=16, color=BLACK),
            Text("• Self-Service", font_size=16, color=BLACK),
            Text("• Automated Services", font_size=16, color=BLACK),
            Text("• Communities", font_size=16, color=BLACK),
            Text("• Co-creation", font_size=16, color=BLACK)
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.2)
        rel_types.next_to(relationships_box, RIGHT, buff=0.5)
        
        self.play(Write(rel_types))
        self.wait(1)
        self.play(FadeOut(rel_types))
        self.play(relationships_box.animate.set_fill(WHITE, opacity=0))

    def animate_revenue_streams(self):
        """Animate Revenue Streams section"""
        revenue_box = self.boxes[4]
        self.play(revenue_box.animate.set_fill(RED, opacity=0.3))
        
        # Show revenue types
        revenue_types = VGroup(
            Text("• Asset Sale", font_size=16, color=BLACK),
            Text("• Usage Fee", font_size=16, color=BLACK),
            Text("• Subscription", font_size=16, color=BLACK),
            Text("• Lending/Renting", font_size=16, color=BLACK),
            Text("• Licensing", font_size=16, color=BLACK),
            Text("• Brokerage", font_size=16, color=BLACK),
            Text("• Advertising", font_size=16, color=BLACK)
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.1)
        revenue_types.next_to(revenue_box, RIGHT, buff=0.5)
        
        self.play(Write(revenue_types))
        self.wait(1)
        self.play(FadeOut(revenue_types))
        self.play(revenue_box.animate.set_fill(WHITE, opacity=0))

    def animate_key_resources(self):
        """Animate Key Resources section"""
        resources_box = self.boxes[5]
        self.play(resources_box.animate.set_fill(YELLOW, opacity=0.3))
        
        # Show resource types
        resource_types = VGroup(
            Text("• Physical", font_size=16, color=BLACK),
            Text("• Intellectual", font_size=16, color=BLACK),
            Text("• Human", font_size=16, color=BLACK),
            Text("• Financial", font_size=16, color=BLACK)
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.2)
        resource_types.next_to(resources_box, RIGHT, buff=0.5)
        
        self.play(Write(resource_types))
        self.wait(1)
        self.play(FadeOut(resource_types))
        self.play(resources_box.animate.set_fill(WHITE, opacity=0))

    def animate_key_activities(self):
        """Animate Key Activities section"""
        activities_box = self.boxes[6]
        self.play(activities_box.animate.set_fill(PINK, opacity=0.3))
        
        # Show activity types
        activity_types = VGroup(
            Text("• Production", font_size=16, color=BLACK),
            Text("• Problem Solving", font_size=16, color=BLACK),
            Text("• Platform/Network", font_size=16, color=BLACK)
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.2)
        activity_types.next_to(activities_box, RIGHT, buff=0.5)
        
        self.play(Write(activity_types))
        self.wait(1)
        self.play(FadeOut(activity_types))
        self.play(activities_box.animate.set_fill(WHITE, opacity=0))

    def animate_key_partnerships(self):
        """Animate Key Partnerships section"""
        partnerships_box = self.boxes[7]
        self.play(partnerships_box.animate.set_fill(TEAL, opacity=0.3))
        
        # Show partnership types
        partnership_types = VGroup(
            Text("• Strategic Alliances", font_size=16, color=BLACK),
            Text("• Joint Ventures", font_size=16, color=BLACK),
            Text("• Buyer-Supplier", font_size=16, color=BLACK),
            Text("• Coopetition", font_size=16, color=BLACK)
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.2)
        partnership_types.next_to(partnerships_box, RIGHT, buff=0.5)
        
        self.play(Write(partnership_types))
        self.wait(1)
        self.play(FadeOut(partnership_types))
        self.play(partnerships_box.animate.set_fill(WHITE, opacity=0))

    def animate_cost_structure(self):
        """Animate Cost Structure section"""
        cost_box = self.boxes[8]
        self.play(cost_box.animate.set_fill(GRAY, opacity=0.3))
        
        # Show cost types
        cost_types = VGroup(
            Text("• Cost-Driven", font_size=16, color=BLACK),
            Text("• Value-Driven", font_size=16, color=BLACK),
            Text("• Fixed Costs", font_size=16, color=BLACK),
            Text("• Variable Costs", font_size=16, color=BLACK),
            Text("• Economies of Scale", font_size=16, color=BLACK),
            Text("• Economies of Scope", font_size=16, color=BLACK)
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.1)
        cost_types.next_to(cost_box, RIGHT, buff=0.5)
        
        self.play(Write(cost_types))
        self.wait(1)
        self.play(FadeOut(cost_types))
        self.play(cost_box.animate.set_fill(WHITE, opacity=0))

    def show_connections(self):
        """Show key connections between BMC sections"""
        # Key connections to highlight
        connections = [
            # Customer Segments -> Value Proposition
            Arrow(self.boxes[0].get_right(), self.boxes[1].get_left(), color=BLUE, stroke_width=4),
            # Value Proposition -> Revenue Streams
            Arrow(self.boxes[1].get_bottom(), self.boxes[4].get_top(), color=GREEN, stroke_width=4),
            # Key Resources -> Key Activities
            Arrow(self.boxes[5].get_bottom(), self.boxes[6].get_top(), color=YELLOW, stroke_width=4),
            # Key Activities -> Value Proposition
            Arrow(self.boxes[6].get_right(), self.boxes[1].get_bottom(), color=PINK, stroke_width=4)
        ]
        
        # Animate connections
        for connection in connections:
            self.play(Create(connection), run_time=0.8)
        
        # Add labels for key flows
        flow_labels = VGroup(
            Text("Who?", font_size=14, color=BLUE).next_to(connections[0], UP, buff=0.1),
            Text("What Value?", font_size=14, color=GREEN).next_to(connections[1], RIGHT, buff=0.1),
            Text("How?", font_size=14, color=YELLOW).next_to(connections[2], RIGHT, buff=0.1),
            Text("Value Creation", font_size=14, color=PINK).next_to(connections[3], DOWN, buff=0.1)
        )
        
        self.play(Write(flow_labels))
        self.wait(1)
        self.play(FadeOut(VGroup(*connections, flow_labels)))

    def show_summary(self):
        """Show final summary of BMC framework"""
        summary = VGroup(
            Text("Business Model Canvas Summary", font_size=32, color=BLACK, weight=BOLD),
            Text("• 9 building blocks for business model design", font_size=20, color=BLACK),
            Text("• Customer-focused (right side) vs. Infrastructure (left side)", font_size=20, color=BLACK),
            Text("• Value proposition is the heart of the model", font_size=20, color=BLACK),
            Text("• All elements must work together cohesively", font_size=20, color=BLACK)
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.3)
        summary.to_edge(DOWN, buff=1)
        
        # Highlight the value proposition box
        self.play(self.boxes[1].animate.set_fill(GREEN, opacity=0.5))
        self.play(Write(summary))
        self.wait(2)
        self.play(self.boxes[1].animate.set_fill(WHITE, opacity=0))