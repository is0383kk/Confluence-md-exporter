/* turndown.js (UMD-style minimal shim) */
(function (global, factory) {
  if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = factory();
  } else if (typeof define === "function" && define.amd) {
    define(factory);
  } else {
    global.TurndownService = factory();
  }
})(this, function () {
  "use strict";
  function TurndownService(options) {
    this.options = Object.assign({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-",
      emDelimiter: "_"
    }, options || {});
    this._rules = [];
  }
  TurndownService.prototype.addRule = function(name, rule) {
    this._rules.push({ name, rule });
  };
  TurndownService.prototype.turndown = function (html) {
    var container = document.createElement("div");
    container.innerHTML = html;
    function isElement(n){return n && n.nodeType===1;} function isText(n){return n && n.nodeType===3;}
    var rules = this._rules, opts = this.options;
    function applyRules(content, node) {
      for (var i = rules.length - 1; i >= 0; i--) {
        var r = rules[i].rule; var match=false;
        if (typeof r.filter === "string") match=isElement(node)&&node.tagName.toLowerCase()===r.filter.toLowerCase();
        else if (typeof r.filter === "function") { try{match=r.filter(node);}catch(e){match=false;} }
        if (match) return r.replacement(content, node, opts);
      } return null;
    }
    function render(node){
      if (isText(node)) return node.nodeValue;
      if (!isElement(node)) return "";
      var tag=node.tagName.toLowerCase(); var content="";
      node.childNodes.forEach(function(n){ content += isText(n) ? n.nodeValue : render(n); });
      var ruleOut=applyRules(content,node); if (ruleOut!==null) return ruleOut;
      switch(tag){
        case "h1":case "h2":case "h3":case "h4":case "h5":case "h6":{
          var level=parseInt(tag[1],10);
          if (opts.headingStyle==="setext"&&(level===1||level===2)){
            var u=level===1?"=":"-"; return content.trim()+"\n"+(u.repeat(Math.max(3,content.trim().length)))+"\n\n";
          } else { return "#".repeat(level)+" "+content.trim()+"\n\n"; }
        }
        case "p":case "div": return content.trim()?content.trim()+"\n\n":"";
        case "br": return "  \n";
        case "strong":case "b": return content?"**"+content+"**":"";
        case "em":case "i": return content?"_"+content+"_":"";
        case "code":
          if (node.parentElement && node.parentElement.tagName.toLowerCase()==="pre") return content;
          return "`"+content+"`";
        case "pre":{
          var code=node.textContent.replace(/\n+$/, "");
          if (opts.codeBlockStyle==="fenced"){ return "```\n"+code+"\n```\n\n"; }
          else { return code.split("\n").map(function(l){return "    "+l;}).join("\n")+"\n\n"; }
        }
        case "blockquote": return content.split("\n").map(l=>l?"> "+l:"").join("\n")+"\n\n";
        case "ul":{
          var out=""; Array.from(node.children).forEach(function(li){ out+=renderListItem(li, opts.bulletListMarker||"-"); });
          return out+"\n";
        }
        case "ol":{
          var outO=""; var idx=1; Array.from(node.children).forEach(function(li){ outO+=renderListItem(li, idx+"."); idx+=1; });
          return outO+"\n";
        }
        case "li": return content+"\n";
        case "a": {
          var href=node.getAttribute("href")||""; if (!href) return content;
          var abs; try{abs=new URL(href, location.origin).href;}catch(e){abs=href;}
          return "["+(content||abs)+"]("+abs+")";
        }
        case "img":{
          var alt=node.getAttribute("alt")||""; var src=node.getAttribute("src")||""; if (!src) return "";
          var absI; try{absI=new URL(src, location.origin).href;}catch(e){absI=src;}
          return "!["+alt+"]("+absI+")";
        }
        case "table":{
          var rows=Array.from(node.querySelectorAll("tr")); if (!rows.length) return "";
          var cells=(tr,sel)=>Array.from(tr.querySelectorAll(sel)).map(c=>(c.textContent||"").trim());
          var header=cells(rows[0], "th,td");
          var md="| "+header.join(" | ")+" |\n";
          md+="|"+header.map(()=>("---")).join("|")+"|\n";
          rows.slice(1).forEach(tr=>{ var r=cells(tr, "td,th"); md+="| "+r.join(" | ")+" |\n"; });
          return md+"\n\n";
        }
        default: return content;
      }
    }
    function renderListItem(li, marker){
      var lines=render(li).split("\n").filter(x=>x.length||x==="");
      if (!lines.length) return "";
      var first=marker+" "+(lines[0]||"").trim();
      var rest=lines.slice(1).map(l=>l?("  "+l):"").join("\n");
      return first+(rest?("\n"+rest):"")+"\n";
    }
    var out=""; container.childNodes.forEach(n=>{ out+=render(n); });
    return out.replace(/\n{3,}/g, "\n\n").trim()+"\n";
  };
  return TurndownService;
});
