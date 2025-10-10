#!/usr/bin/env python3
"""
Manim Animation Renderer Service for NGI Learning Center
Handles async rendering of educational animations
"""

import asyncio
import os
import uuid
import json
import subprocess
from datetime import datetime
from typing import Dict, List, Optional
from queue import Queue
from dataclasses import dataclass
from pathlib import Path

@dataclass
class RenderJob:
    """Represents a Manim render job"""
    job_id: str
    scene_name: str
    params: Dict
    status: str  # 'queued', 'rendering', 'completed', 'failed'
    created_at: datetime
    completed_at: Optional[datetime] = None
    output_file: Optional[str] = None
    error_message: Optional[str] = None
    progress: int = 0  # 0-100

class ManimRenderService:
    """Service for managing Manim animation rendering"""
    
    def __init__(self):
        self.render_queue = Queue()
        self.jobs: Dict[str, RenderJob] = {}
        self.cache_dir = Path("uploads/learning_animations/cache")
        self.output_dir = Path("uploads/learning_animations/rendered")
        self.scenes_dir = Path("scripts/manim_scenes")
        
        # Create directories
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.scenes_dir.mkdir(parents=True, exist_ok=True)
        
        # Start background worker
        self._worker_running = True
        asyncio.create_task(self._worker_loop())
    
    async def render_scene(self, scene_name: str, params: Dict = None) -> str:
        """Queue a Manim scene for rendering"""
        if params is None:
            params = {}
        
        job_id = str(uuid.uuid4())
        
        job = RenderJob(
            job_id=job_id,
            scene_name=scene_name,
            params=params,
            status='queued',
            created_at=datetime.utcnow()
        )
        
        self.jobs[job_id] = job
        self.render_queue.put(job)
        
        return job_id
    
    async def get_job_status(self, job_id: str) -> Optional[Dict]:
        """Get the status of a render job"""
        job = self.jobs.get(job_id)
        if not job:
            return None
        
        return {
            "job_id": job.job_id,
            "scene_name": job.scene_name,
            "status": job.status,
            "progress": job.progress,
            "created_at": job.created_at.isoformat(),
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "output_file": job.output_file,
            "error_message": job.error_message
        }
    
    async def get_queue_status(self) -> Dict:
        """Get current render queue status"""
        return {
            "queue_size": self.render_queue.qsize(),
            "total_jobs": len(self.jobs),
            "active_jobs": len([j for j in self.jobs.values() if j.status == 'rendering']),
            "completed_jobs": len([j for j in self.jobs.values() if j.status == 'completed']),
            "failed_jobs": len([j for j in self.jobs.values() if j.status == 'failed'])
        }
    
    async def _worker_loop(self):
        """Background worker that processes render jobs"""
        while self._worker_running:
            try:
                if not self.render_queue.empty():
                    job = self.render_queue.get()
                    await self._process_render(job)
                else:
                    await asyncio.sleep(1)  # Check every second
            except Exception as e:
                print(f"Error in render worker: {e}")
                await asyncio.sleep(5)
    
    async def _process_render(self, job: RenderJob):
        """Process a single render job"""
        try:
            job.status = 'rendering'
            job.progress = 10
            
            # Check if scene file exists
            scene_file = self.scenes_dir / f"{job.scene_name}.py"
            if not scene_file.exists():
                raise FileNotFoundError(f"Scene file not found: {scene_file}")
            
            # Generate output filename
            output_file = self.output_dir / f"{job.job_id}.mp4"
            
            # Build Manim command
            cmd = [
                "manim",
                "-pql",  # Preview, quality low for faster rendering
                str(scene_file),
                f"{job.scene_name}Scene",
                "-o", str(output_file)
            ]
            
            job.progress = 20
            
            # Run Manim command
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(self.scenes_dir)
            )
            
            job.progress = 30
            
            # Monitor progress (simplified - in real implementation, parse Manim output)
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                job.status = 'completed'
                job.progress = 100
                job.completed_at = datetime.utcnow()
                job.output_file = str(output_file)
                
                # Verify file was created
                if not output_file.exists():
                    raise FileNotFoundError("Output file was not created")
                
            else:
                raise Exception(f"Manim failed: {stderr.decode()}")
                
        except Exception as e:
            job.status = 'failed'
            job.error_message = str(e)
            job.completed_at = datetime.utcnow()
            print(f"Render job {job.job_id} failed: {e}")
    
    def stop_worker(self):
        """Stop the background worker"""
        self._worker_running = False

# Global render service instance
render_service = ManimRenderService()

# =============================================================================
# CORE MANIM SCENES
# =============================================================================

def create_business_model_canvas_scene():
    """Create Business Model Canvas visualization scene"""
    scene_content = '''from manim import *

class BMCScene(Scene):
    def construct(self):
        # Create 9 boxes for BMC
        boxes = VGroup(*[Rectangle(height=2, width=2.5) for _ in range(9)])
        boxes.arrange_in_grid(rows=3, cols=3, buff=0.2)
        
        labels = [
            "Customer\\nSegments", "Value\\nProposition", "Channels", 
            "Customer\\nRelationships", "Revenue\\nStreams", "Key\\nResources",
            "Key\\nActivities", "Key\\nPartnerships", "Cost\\nStructure"
        ]
        
        # Create text labels
        text_objects = []
        for box, label in zip(boxes, labels):
            text = Text(label, font_size=20).move_to(box)
            text_objects.append(text)
        
        # Animate boxes and labels
        for box, text in zip(boxes, text_objects):
            self.play(Create(box), Write(text), run_time=0.5)
        
        self.wait(2)
        
        # Highlight value proposition
        value_prop_box = boxes[1]
        value_prop_text = text_objects[1]
        self.play(
            value_prop_box.animate.set_fill(YELLOW, opacity=0.3),
            value_prop_text.animate.set_color(RED),
            run_time=1
        )
        
        self.wait(1)
        
        # Show connections
        arrow1 = Arrow(boxes[0].get_right(), boxes[1].get_left(), color=BLUE)
        arrow2 = Arrow(boxes[1].get_right(), boxes[2].get_left(), color=BLUE)
        
        self.play(Create(arrow1), Create(arrow2), run_time=1)
        self.wait(2)
'''
    
    scene_file = Path("scripts/manim_scenes/bmc_visualization.py")
    scene_file.write_text(scene_content)
    return scene_file

def create_three_statement_flow_scene():
    """Create Three Statement Flow visualization scene"""
    scene_content = '''from manim import *

class ThreeStatementScene(Scene):
    def construct(self):
        # Income Statement box
        is_box = Rectangle(height=2, width=4, color=BLUE).shift(UP*2)
        is_label = Text("Income Statement", font_size=24).move_to(is_box)
        
        # Balance Sheet box
        bs_box = Rectangle(height=2, width=4, color=GREEN)
        bs_label = Text("Balance Sheet", font_size=24).move_to(bs_box)
        
        # Cash Flow box
        cf_box = Rectangle(height=2, width=4, color=PURPLE).shift(DOWN*2)
        cf_label = Text("Cash Flow Statement", font_size=24).move_to(cf_box)
        
        # Animate boxes
        self.play(Create(is_box), Write(is_label), run_time=1)
        self.wait(0.5)
        self.play(Create(bs_box), Write(bs_label), run_time=1)
        self.wait(0.5)
        self.play(Create(cf_box), Write(cf_label), run_time=1)
        
        # Show connections with arrows
        arrow1 = Arrow(is_box.get_bottom(), bs_box.get_top(), color=YELLOW)
        arrow2 = Arrow(bs_box.get_bottom(), cf_box.get_top(), color=YELLOW)
        
        self.play(Create(arrow1), Create(arrow2), run_time=1)
        self.wait(1)
        
        # Highlight key items
        net_income = Text("Net Income", font_size=16, color=RED).next_to(is_box, RIGHT)
        self.play(Write(net_income), run_time=0.5)
        
        retained_earnings = Text("Retained Earnings", font_size=16, color=RED).next_to(bs_box, RIGHT)
        self.play(Write(retained_earnings), run_time=0.5)
        
        operating_cash = Text("Operating Cash Flow", font_size=16, color=RED).next_to(cf_box, RIGHT)
        self.play(Write(operating_cash), run_time=0.5)
        
        self.wait(2)
'''
    
    scene_file = Path("scripts/manim_scenes/three_statement_flow.py")
    scene_file.write_text(scene_content)
    return scene_file

def create_dcf_tree_scene():
    """Create DCF Valuation Tree visualization scene"""
    scene_content = '''from manim import *

class DCFTreeScene(Scene):
    def construct(self):
        # Terminal value at top
        tv_box = Rectangle(height=1, width=3, color=GOLD).shift(UP*3)
        tv_label = Text("Terminal\\nValue", font_size=20).move_to(tv_box)
        
        # Forecast cash flows
        cf_boxes = VGroup(*[
            Rectangle(height=0.8, width=1.5, color=BLUE).shift(RIGHT*(i-2)*2)
            for i in range(5)
        ]).shift(UP)
        
        cf_labels = [Text(f"FCF Y{i+1}", font_size=16).move_to(box) for i, box in enumerate(cf_boxes)]
        
        # Present value box at bottom
        pv_box = Rectangle(height=1.5, width=6, color=GREEN).shift(DOWN*2)
        pv_label = Text("Enterprise Value\\n(Sum of PVs)", font_size=24).move_to(pv_box)
        
        # Animate
        self.play(Create(tv_box), Write(tv_label), run_time=1)
        self.play(*[Create(box) for box in cf_boxes], *[Write(label) for label in cf_labels], run_time=1)
        
        # Show arrows discounting to PV
        arrows = VGroup(*[Arrow(box.get_bottom(), pv_box.get_top(), color=YELLOW) for box in cf_boxes])
        self.play(Create(arrows), run_time=1)
        self.play(Create(pv_box), Write(pv_label), run_time=1)
        
        # Add discount rate
        wacc_text = Text("WACC = 10%", font_size=18, color=RED).shift(UP*0.5)
        self.play(Write(wacc_text), run_time=0.5)
        
        self.wait(2)
'''
    
    scene_file = Path("scripts/manim_scenes/dcf_tree.py")
    scene_file.write_text(scene_content)
    return scene_file

def create_revenue_qxp_scene():
    """Create Revenue Q x P visualization scene"""
    scene_content = '''from manim import *

class RevenueQxPScene(Scene):
    def construct(self):
        # Title
        title = Text("Revenue = Quantity × Price", font_size=36, color=BLUE)
        title.to_edge(UP)
        self.play(Write(title), run_time=1)
        
        # Q (Quantity) section
        q_box = Rectangle(height=2, width=2, color=GREEN).shift(LEFT*3)
        q_label = Text("Quantity (Q)", font_size=20).move_to(q_box)
        q_examples = Text("Units sold\\nCustomers\\nTransactions", font_size=14).next_to(q_box, DOWN)
        
        # × symbol
        times_symbol = Text("×", font_size=48, color=YELLOW)
        
        # P (Price) section
        p_box = Rectangle(height=2, width=2, color=RED).shift(RIGHT*3)
        p_label = Text("Price (P)", font_size=20).move_to(p_box)
        p_examples = Text("Unit price\\nARPU\\nTransaction value", font_size=14).next_to(p_box, DOWN)
        
        # Animate
        self.play(Create(q_box), Write(q_label), run_time=0.5)
        self.play(Write(q_examples), run_time=0.5)
        self.play(Write(times_symbol), run_time=0.5)
        self.play(Create(p_box), Write(p_label), run_time=0.5)
        self.play(Write(p_examples), run_time=0.5)
        
        # Result
        result_box = Rectangle(height=2, width=4, color=GOLD).shift(DOWN*2)
        result_label = Text("Revenue", font_size=24).move_to(result_box)
        
        # Arrows
        arrow1 = Arrow(q_box.get_bottom(), result_box.get_top(), color=GREEN)
        arrow2 = Arrow(p_box.get_bottom(), result_box.get_top(), color=RED)
        
        self.play(Create(arrow1), Create(arrow2), run_time=1)
        self.play(Create(result_box), Write(result_label), run_time=1)
        
        # Example calculation
        example = Text("Example: 1,000 units × $50 = $50,000", font_size=18, color=WHITE)
        example.next_to(result_box, DOWN)
        self.play(Write(example), run_time=1)
        
        self.wait(2)
'''
    
    scene_file = Path("scripts/manim_scenes/revenue_qxp.py")
    scene_file.write_text(scene_content)
    return scene_file

def create_excel_formula_demo_scene():
    """Create Excel Formula Walkthrough scene"""
    scene_content = '''from manim import *

class ExcelFormulaScene(Scene):
    def construct(self):
        # Create Excel-like grid
        grid = NumberPlane(
            x_range=[0, 10], y_range=[0, 10],
            x_length=10, y_length=6,
            background_line_style={"stroke_color": GREY, "stroke_width": 1}
        )
        
        # Add Excel headers
        headers = VGroup(*[
            Text(chr(65 + i), font_size=16, color=BLUE).shift(RIGHT * (i - 4.5) * 1.2 + UP * 2.8)
            for i in range(10)
        ])
        
        numbers = VGroup(*[
            Text(str(i), font_size=16, color=BLUE).shift(LEFT * 2.8 + UP * (2.5 - i * 0.3))
            for i in range(1, 11)
        ])
        
        self.play(Create(grid), Write(headers), Write(numbers), run_time=1)
        
        # Show cell references
        cell_a1 = Text("A1: 100", color=BLUE, font_size=20).shift(UP*2+LEFT*3)
        cell_a2 = Text("A2: 50", color=BLUE, font_size=20).shift(UP+LEFT*3)
        cell_a3 = Text("A3: =A1+A2", color=BLACK, font_size=20).shift(LEFT*3)
        
        self.play(Write(cell_a1), Write(cell_a2), run_time=0.5)
        self.wait(1)
        self.play(Write(cell_a3), run_time=0.5)
        
        # Animate formula execution
        result = Text("A3: 150", color=BLACK, font_size=20).shift(LEFT*3)
        self.play(Transform(cell_a3, result), run_time=1)
        
        # Show formula breakdown
        breakdown = VGroup(
            Text("=A1+A2", font_size=16, color=RED),
            Text("=100+50", font_size=16, color=RED),
            Text("=150", font_size=16, color=RED)
        ).arrange(DOWN, buff=0.3).shift(RIGHT*3)
        
        for line in breakdown:
            self.play(Write(line), run_time=0.5)
        
        self.wait(2)
'''
    
    scene_file = Path("scripts/manim_scenes/excel_formula_demo.py")
    scene_file.write_text(scene_content)
    return scene_file

# =============================================================================
# INITIALIZATION
# =============================================================================

def initialize_manim_scenes():
    """Create all core Manim scene files"""
    scenes = [
        create_business_model_canvas_scene,
        create_three_statement_flow_scene,
        create_dcf_tree_scene,
        create_revenue_qxp_scene,
        create_excel_formula_demo_scene
    ]
    
    created_scenes = []
    for create_scene in scenes:
        try:
            scene_file = create_scene()
            created_scenes.append(scene_file)
            print(f"Created scene: {scene_file}")
        except Exception as e:
            print(f"Error creating scene: {e}")
    
    return created_scenes

if __name__ == "__main__":
    # Initialize scenes
    scenes = initialize_manim_scenes()
    print(f"Initialized {len(scenes)} Manim scenes")
    
    # Test render service
    async def test_render():
        service = ManimRenderService()
        
        # Queue a test render
        job_id = await service.render_scene("bmc_visualization")
        print(f"Queued render job: {job_id}")
        
        # Check status
        for i in range(10):
            status = await service.get_job_status(job_id)
            print(f"Status: {status}")
            if status and status['status'] in ['completed', 'failed']:
                break
            await asyncio.sleep(2)
    
    # Run test
    asyncio.run(test_render())

# Backward-compatible alias expected by some routes
# Some code imports `manim_renderer_service`; expose alias to the same instance
manim_renderer_service = render_service
