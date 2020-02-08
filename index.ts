const w : number = window.innerWidth
const h : number = window.innerHeight
const lines : number = 2
const scGap : number = 0.02 / lines
const strokeFactor : number = 90
const sizeFactor : number = 2.9
const foreColor : string = "#9c27b0"
const backColor : string = "#bdbdbd"
const delay : number = 30
const nodes : number = 5

class State {

    scale : number = 0
    dir : number = 0
    prevScale : number = 0

    update(cb : Function) {
        this.scale += scGap * this.dir
        if (Math.abs(this.scale - this.prevScale) > 1) {
            this.scale = this.prevScale + this.dir
            this.dir = 0
            this.prevScale = this.scale
            cb()
        }
    }

    startUpdating(cb : Function) {
        if (this.dir == 0) {
            this.dir = 1 - 2 * this.prevScale
            cb()
        }
    }
}

class Animator {

    animated : boolean = false
    interval : number

    start(cb : Function) {
        if (!this.animated) {
            this.animated = true
            this.interval = setInterval(cb, delay)
        }
    }

    stop() {
        if (this.animated) {
            this.animated = false
            clearInterval(this.interval)
        }
    }
}

class Stage {

    canvas : HTMLCanvasElement = document.createElement('canvas')
    context : CanvasRenderingContext2D
    renderer : Renderer = new Renderer()

    initCanvas() {
        this.context = this.canvas.getContext('2d')
        this.canvas.width = w
        this.canvas.height = h
        document.body.appendChild(this.canvas)
    }

    render() {
        this.context.fillStyle = backColor
        this.context.fillRect(0, 0, w, h)
        this.renderer.render(this.context)
    }

    handleTap() {
        this.canvas.onmousedown = () => {
            this.renderer.handleTap(() => {
                this.render()
            })
        }
    }

    static init() {
        const stage : Stage = new Stage()
        stage.initCanvas()
        stage.render()
        stage.handleTap()
    }
}

class ScaleUtil {

    static maxScale(scale : number, i : number, n : number) : number {
        return Math.max(0, scale - i / n)
    }

    static divideScale(scale : number, i : number, n : number) : number {
        return Math.min(1 / n, ScaleUtil.maxScale(scale, i, n)) * n
    }

    static sinify(scale : number) : number {
        return Math.sin(Math.PI * scale)
    }

    static cosify(scale : number) : number {
        const sf : number = ScaleUtil.divideScale(scale, 0, 2)
        return Math.sin(sf * Math.PI / 2)
    }
}

class DrawingUtil {

    static drawLine(context : CanvasRenderingContext2D, x1 : number, y1 : number, x2 : number, y2 : number) {
        context.beginPath()
        context.moveTo(x1, y1)
        context.lineTo(x2, y2)
        context.stroke()
    }

    static drawHorizontalLinePuncher(context : CanvasRenderingContext2D, i : number, scale : number, w : number, size : number) {
        const sf : number = ScaleUtil.sinify(scale)
        const sfi : number = ScaleUtil.divideScale(sf, i, lines)
        const sj : number = 1 - 2 * i
        const sx : number = w * i
        const x : number = (w / 2) * sfi * sj
        context.save()
        context.translate(sx, 0)
        DrawingUtil.drawLine(context, 0, 0, x, 0)
        DrawingUtil.drawLine(context, x, 0, x, -size * sj)
        context.restore()
    }

    static drawHLPNode(context : CanvasRenderingContext2D, i : number, scale : number) {
        const gap : number = h / (nodes + 1)
        const size : number = gap / sizeFactor
        context.lineCap = 'round'
        context.lineWidth = Math.min(w, h) / strokeFactor
        context.strokeStyle = foreColor
        context.save()
        context.translate(0, gap * (i + 1))
        for (var j = 0; j < lines; j++) {
            DrawingUtil.drawHorizontalLinePuncher(context, j, scale, w, size)
        }
        context.restore()
    }
}
class HLPNode {

    state : State = new State()
    next : HLPNode
    prev : HLPNode

    constructor(private i : number) {
        this.addNeighbor()
    }

    addNeighbor() {
        if (this.i < nodes - 1) {
            this.next = new HLPNode(this.i + 1)
            this.next.prev = this
        }
    }

    draw(context : CanvasRenderingContext2D) {
        DrawingUtil.drawHLPNode(context, this.i, this.state.scale)
    }

    update(cb : Function) {
        this.state.update(cb)
    }

    startUpdating(cb : Function) {
        this.state.startUpdating(cb)
    }

    getNext(dir : number, cb : Function) {
        var curr : HLPNode = this.prev
        if (dir == 1) {
            curr = this.next
        }
        if (curr) {
            return curr
        }
        cb()
        return this
    }
}

class HorizontalLinePuncher {

    curr : HLPNode = new HLPNode(0)
    dir : number = 1

    draw(context : CanvasRenderingContext2D) {
        this.curr.draw(context)
    }

    update(cb : Function) {
        this.curr.update(() => {
            this.curr = this.curr.getNext(this.dir, () => {
                this.dir *= -1
            })
            cb()
        })
    }

    startUpdating(cb : Function) {
        this.curr.startUpdating(cb)
    }
}

class Renderer {

    hlp : HorizontalLinePuncher = new HorizontalLinePuncher()

    animator : Animator = new Animator()

    render(context : CanvasRenderingContext2D) {
        this.hlp.draw(context)
    }

    handleTap(cb : Function) {
        this.hlp.startUpdating(() => {
            this.animator.start(() => {
                cb()
                this.hlp.update(() => {
                    this.animator.stop()
                    cb()
                })
            })
        })
    }
}
