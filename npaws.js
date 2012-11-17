#!/usr/bin/env node
var USE_COLOR = process.env['USE_COLOR'] === 'false' || true
  ,     DEBUG = process.env['DEBUG']     === 'false' || true


~function(){ var Thing, Association, Execution, Alien, Label, Pair, Instruction, Locals, Juxtapose, Value, parse, Stage, Staging, run
               , log, I, ANSI, getter
   
, API = function(){
   /* Things */
   Thing = function Thing() {
      this._id = Thing.counter++
      this.members = [] }
   Thing.counter = 1
   Association = function Association(to, responsible) {
      this.to = to
      this.responsible = responsible || false }
   Pair = function Pair(key, value) {
      this.key = key
      this.value = value }
   
   getter(Thing.prototype, 'named', function named() { return this.hasOwnProperty('name') })
   Thing.prototype.name = function name(name) { this.name = name; return this }
   Thing.prototype._name = function _name(name) { this.toString = function toString(){return name}; return this }
   Thing.prototype.toString = function toString() { return this.named? this.name:'' }
   Thing.prototype.inspect = function inspect() { return ANSI.brblack('❲'+this._id+'❳')+this.toString() } 
   
   // Since we're doing a associative-array implementation ...
   Thing.prototype.affix = function affix(key, value, responsible) {
      if (key instanceof Label && !value.named) value.name = key.text
      this.members.push(new Association(new Pair(key, value), responsible)) }
   
   Execution = function Execution(code) { Thing.call(this)
      if (typeof code === 'function')
         return new Alien(code)
      this.code = code
      this.stack = []
      this.locals = new Thing()._name(ANSI.brblack('locals')) }
 ;(Execution.prototype = new Thing).constructor = Execution
   Execution.prototype.toString = function toString() {
      return ANSI.brmagenta(this.named? '`'+this.name+'`' : '`anon`') }
   Execution.prototype.inspect = function() { var rv = new Array
      rv.push(ANSI.brwhite('|') + this.stack.map(function(e){
         return Thing.prototype.inspect.call(e) })
            .join(ANSI.brwhite(', ')) + ANSI.brwhite('|'))
      rv.push(ANSI.brwhite('[') + this.code.map(function(e){
         return e.inspect() })
            .join(ANSI.brwhite(' ')) + ANSI.brwhite(']'))
      return rv.join("\n") }
   
   Alien = function Alien(code) { Execution.call(this)
      this.native = code
      this.native.wrapper = this
      if (this.native.name) this.name = this.native.name }
 ;(Alien.prototype = new Execution).constructor = Alien
   Alien.prototype.toString = function toString() {
      return ANSI.brmagenta(this.named? '´'+this.name+'´' : '´anon´') }
   Alien.prototype.inspect = Thing.prototype.inspect
   
   Label = function Label(text) { Thing.call(this)
      this.text = text }
 ;(Label.prototype = new Thing).constructor = Label
   Label.prototype.toString = function toString() { return ANSI.cyan("'"+this.text+"'") }
   
   /* Bytecode */
   Instruction = function Instruction() {}
   Instruction.prototype.toString = function toString() { return ANSI.brwhite('I') }
   Instruction.prototype.inspect = function inspect() { return this.toString.apply(this, arguments) }
   
   Locals = function Locals() { Instruction.call(this) }
 ;(Locals.prototype = new Instruction).constructor = Locals
   
   Me = function Me() { Instruction.call(this) }
 ;(Me.prototype = new Instruction).constructor = Me
   Me.prototype.toString = function toString() { return ANSI.brwhite('I:()') }
   
   Juxtapose = function Juxtapose() { Instruction.call(this) }
 ;(Juxtapose.prototype = new Instruction).constructor = Juxtapose
   Juxtapose.prototype.toString = function toString() { return ANSI.brwhite('×') }
   
   Value = function Value(contents) { Instruction.call(this)
      this.contents = contents }
 ;(Value.prototype = new Instruction).constructor = Value
   Value.prototype.toString = function toString() {
      return ANSI.brwhite('I:')+this.contents.toString() }
   
   
   /* Parsing */
   parse = function parse(text) { var i = 0
      , character = function character(c){ return text[i] === c && ++i }
      , whitespace = function whitespace(){ while (character(' ')); return true }
      , bracket = function bracket(begin, end) { var result
         return whitespace() && character(begin) && (result = expr()) &&
                whitespace() && character(end) &&
                result }
      
      , paren = function parse() { var result
         if ((result = bracket('(', ')')).length == 1)
            return [new Me()]
         return result }
      , scope = function scope() { var result
         return (result = bracket('{', '}')) && [new Value(new Execution(result))] }
      , label = function label(){ whitespace(); var result = ''
           while ( text[i] && /[^(){} \n;]/.test(text[i]) )
              result = result.concat(text[i++])
           return result && [new Value(new Label(result))] }
      
      , expr = function expr() { var term, result = [new Locals()]
         while (term = paren() || scope() || label())
            result = result.concat(term).concat(new Juxtapose())
         return result }
      , program = function program() { var line, result = expr()
         while ((character('\n') || character(';')) && (line = expr()))
            result = result.concat(line)
         return result }
      
      return program() }
   
   /* Execution */
   Thing.prototype.handler = new Execution(function _thing_(left, right, context) {
      for (var i = 0; i < left.members.length; i++) {
         if (left.members[i].to.key.text === right.text) { Stage.stage(context, left.members[i].to.value) } }
         return null; })
   Execution.prototype.handler = new Execution(function _execution_(left, right, context) { var instruction
      if (left.native)
         return left.native(right, context)
      if (left.code) {
         left.stack.push(right)
         while (left.code.length > 0) { instruction = left.code.shift()
            switch (instruction.constructor.name) {
               case 'Locals':
                  left.stack.push(left.locals);
               case 'Me':
                  left.stack.push(left);
               break; case 'Value':
                  left.stack.push(instruction.contents);
               break; case 'Juxtapose':
                  var b = left.stack.pop()
                    , a = left.stack.pop()
                  Stage.stage(a, b, left)
                  return } } } })
   
   /* Staging */
   Stage = {}
   Stage.queue = []
   
   Staging = function Staging(stagee, value, context) {
      this.stagee = stagee
      this.value = value
      this.context = context }
   
   Stage.stage = function stage(stagee, value, context) {
      Stage.queue.push(new Staging(stagee, value, context)) }
   Stage.result = function result(context, value) { var caller = arguments.callee.caller
      if (value instanceof Execution && arguments.callee.caller.wrapper instanceof Execution
      &&  caller.wrapper.named && !value.named)
          value.name = caller.wrapper.name + '.' // Accrue periods onto the name for each coconsumer
      Stage.stage(context, value || null) }
   
   Stage.next = function next() {
      var staging = Stage.queue.shift()
      log(I(staging.stagee)+' ✦ '+I(staging.value))
      if (staging.stagee.handler.native) {
         staging.stagee.handler.native(staging.stagee, staging.value, staging.context) } }
} // /API
      
   /* Wrap it all up */
   run = function run(text) { var
      execution = new Execution(parse(text))._name(ANSI.brmagenta('root'))
      execution.locals.affix(new Label('whee!'), new Execution(function(caller) {
         console.log('whee!')
         Stage.stage(caller, null) }))
      execution.locals.affix(new Label('print'), new Execution(function(caller) {
                            Stage.result(caller, new Execution(function(label) {
         console.log(label.text)
         Stage.stage(caller, null) })) }))
      execution.locals.affix(new Label('inspect'), new Execution(function(caller) {
                              Stage.result(caller, new Execution(function(thing) {
         console.log(thing.inspect())
         Stage.stage(caller, null) })) }))
      execution.locals.affix(new Label('affix'), new Execution(function(caller) {
                            Stage.result(caller, new Execution(function(receiver) {
                            Stage.result(caller, new Execution(function(label) {
                            Stage.result(caller, new Execution(function(value) {
         receiver.affix(label, value)
         Stage.stage(caller, null) })) })) })) }))
      
      Stage.stage(execution, null)
      while (Stage.queue.length > 0) {
         Stage.next() } }
   
   /* elliottcable-Plumbing */
   I = function I(it) { return it? ANSI.brblack('❲'+it._id+'❳')+it.toString() : ANSI.red('null')  } 
   log = function log(text) { if (DEBUG) { var line = (new Error).stack.split("\n")[2].split(':')[1]
      console.log( ANSI.SGR(40)
        +(log.caller.name || '<anon>')+'('+ANSI.brblack('#'+line)+'): '
        +([].slice.call(arguments).join(', '))
        +' '+ANSI.SGR(49) ) }}
   ANSI = new Array
   ANSI[30] = 'black';   ANSI[31] = 'red';       ANSI[32] = 'green';   ANSI[33] = 'yellow'
   ANSI[34] = 'blue';    ANSI[35] = 'magenta';   ANSI[36] = 'cyan';    ANSI[37] = 'white'; ANSI[39] = 'reset'
   ANSI[90] = 'brblack'; ANSI[91] = 'brred';     ANSI[92] = 'brgreen'; ANSI[93] = 'bryellow'
   ANSI[94] = 'brblue';  ANSI[95] = 'brmagenta'; ANSI[96] = 'brcyan';  ANSI[97] = 'brwhite'; 
   ANSI.SGR = function SGR(text){ return USE_COLOR? '\033['+text+'m' : '' }
   ANSI.regex = /\x1B\[([0-9]+(;[0-9]+)*)?m/g
   ANSI.strip = function strip(text){ return text.replace(ANSI.regex,'') }
   ANSI.forEach(function(name, code, _ANSI){ _ANSI[name] = function ANSI(text){
      return _ANSI.SGR(code) + text + _ANSI.SGR(39) } })
   
   getter = function getter(object, property, getter) {
      if (!object.hasOwnProperty(property))
         Object.defineProperty(object, property, { get:getter, enumerable:false }) }
   
   /* Testing */
   API()
   run(process.argv[2])
}()
