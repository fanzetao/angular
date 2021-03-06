import {Type, isArray, isPresent} from "angular2/src/facade/lang";
import {List, ListWrapper, Map, StringMapWrapper, MapWrapper} from "angular2/src/facade/collection";
import {
  ProtoViewDto,
  DirectiveMetadata,
  ElementBinder,
  DirectiveBinder,
  ElementPropertyBinding,
  EventBinding,
  ViewDefinition
} from "angular2/src/render/api";
import {AST, ASTWithSource} from "angular2/change_detection";
import {Parser} from "angular2/src/change_detection/parser/parser";

export class Serializer {
  static parser: Parser = null;

  static serialize(obj: any, type: Type): Object {
    if (!isPresent(obj)) {
      return null;
    }
    if (isArray(obj)) {
      var serializedObj = [];
      ListWrapper.forEach(obj, (val) => { serializedObj.push(Serializer.serialize(val, type)); });
      return serializedObj;
    }
    if (type == ViewDefinition) {
      return ViewDefinitionSerializer.serialize(obj);
    } else if (type == DirectiveBinder) {
      return DirectiveBinderSerializer.serialize(obj);
    } else if (type == ProtoViewDto) {
      return ProtoViewDtoSerializer.serialize(obj);
    } else if (type == ElementBinder) {
      return ElementBinderSerializer.serialize(obj);
    } else if (type == DirectiveMetadata) {
      return DirectiveMetadataSerializer.serialize(obj);
    } else if (type == ASTWithSource) {
      return ASTWithSourceSerializer.serialize(obj);
    } else {
      throw "No serializer for " + type.toString();
    }
  }

  // TODO: template this to return the type that is passed if possible
  static deserialize(map: List<any>, type: Type, data?: any): any {
    if (!isPresent(map)) {
      return null;
    }
    if (isArray(map)) {
      var obj: List<any> = new List<any>();
      ListWrapper.forEach(map, (val) => { obj.push(Serializer.deserialize(val, type, data)); });
      return obj;
    }

    if (type == ViewDefinition) {
      return ViewDefinitionSerializer.deserialize(map);
    } else if (type == DirectiveBinder) {
      return DirectiveBinderSerializer.deserialize(map);
    } else if (type == ProtoViewDto) {
      return ProtoViewDtoSerializer.deserialize(map);
    } else if (type == DirectiveMetadata) {
      return DirectiveMetadataSerializer.deserialize(map);
    } else if (type == ElementBinder) {
      return ElementBinderSerializer.deserialize(map);
    } else if (type == ASTWithSource) {
      return ASTWithSourceSerializer.deserialize(map, data);
    } else {
      throw "No deserializer for " + type.toString();
    }
  }

  static mapToObject(map: Map<any, any>, type?: Type): Object {
    var object = {};
    var serialize = isPresent(type);

    MapWrapper.forEach(map, (value, key) => {
      if (serialize) {
        object[key] = Serializer.serialize(value, type);
      } else {
        object[key] = value;
      }
    });
    return object;
  }

  /*
   * Transforms a Javascript object into a Map<string, V>
   * If the values need to be deserialized pass in their type
   * and they will be deserialized before being placed in the map
   */
  static objectToMap(obj: Object, type?: Type, data?: any): Map<string, any> {
    if (isPresent(type)) {
      var map: Map<string, any> = new Map();
      StringMapWrapper.forEach(
          obj, (key, val) => { map.set(key, Serializer.deserialize(val, type, data)); });
      return map;
    } else {
      return MapWrapper.createFromStringMap(obj);
    }
  }
}

class ASTWithSourceSerializer {
  static serialize(tree: ASTWithSource): Object {
    return {'input': tree.source, 'location': tree.location};
  }

  static deserialize(obj: any, data: string): AST {
    // TODO: make ASTs serializable
    var ast: AST;
    switch (data) {
      case "interpolation":
        ast = Serializer.parser.parseInterpolation(obj.input, obj.location);
        break;
      case "binding":
        ast = Serializer.parser.parseBinding(obj.input, obj.location);
        break;
      case "simpleBinding":
        ast = Serializer.parser.parseSimpleBinding(obj.input, obj.location);
        break;
      /*case "templateBindings":
        ast = Serializer.parser.parseTemplateBindings(obj.input, obj.location);
        break;*/
      case "interpolation":
        ast = Serializer.parser.parseInterpolation(obj.input, obj.location);
        break;
      default:
        throw "No AST deserializer for " + data;
    }
    return ast;
  }
}

class ViewDefinitionSerializer {
  static serialize(view: ViewDefinition): Object {
    return {
      'componentId': view.componentId,
      'templateAbsUrl': view.templateAbsUrl,
      'template': view.template,
      'directives': Serializer.serialize(view.directives, DirectiveMetadata),
      'styleAbsUrls': view.styleAbsUrls,
      'styles': view.styles
    };
  }
  static deserialize(obj: any): ViewDefinition {
    return new ViewDefinition({
      componentId: obj.componentId,
      templateAbsUrl: obj.templateAbsUrl, template: obj.template,
      directives: Serializer.deserialize(obj.directives, DirectiveMetadata),
      styleAbsUrls: obj.styleAbsUrls,
      styles: obj.styles
    });
  }
}

class DirectiveBinderSerializer {
  static serialize(binder: DirectiveBinder): Object {
    return {
      'directiveIndex': binder.directiveIndex,
      'propertyBindings': Serializer.mapToObject(binder.propertyBindings, ASTWithSource),
      'eventBindings': Serializer.serialize(binder.eventBindings, EventBinding),
      'hostPropertyBindings':
          Serializer.serialize(binder.hostPropertyBindings, ElementPropertyBinding)
    };
  }

  static deserialize(obj: any): DirectiveBinder {
    return new DirectiveBinder({
      directiveIndex: obj.directiveIndex,
      propertyBindings: Serializer.objectToMap(obj.propertyBindings, ASTWithSource, "binding"),
      eventBindings: Serializer.deserialize(obj.eventBindings, EventBinding),
      hostPropertyBindings: Serializer.deserialize(obj.hostPropertyBindings, ElementPropertyBinding)
    });
  }
}

class ElementBinderSerializer {
  static serialize(binder: ElementBinder): Object {
    return {
      'index': binder.index,
      'parentIndex': binder.parentIndex,
      'distanceToParent': binder.distanceToParent,
      'directives': Serializer.serialize(binder.directives, DirectiveBinder),
      'nestedProtoView': Serializer.serialize(binder.nestedProtoView, ProtoViewDto),
      'propertyBindings': Serializer.serialize(binder.propertyBindings, ElementPropertyBinding),
      'variableBindings': Serializer.mapToObject(binder.variableBindings),
      'eventBindings': Serializer.serialize(binder.eventBindings, EventBinding),
      'readAttributes': Serializer.mapToObject(binder.readAttributes)
    };
  }

  static deserialize(obj: any): ElementBinder {
    return new ElementBinder({
      index: obj.index,
      parentIndex: obj.parentIndex,
      distanceToParent: obj.distanceToParent,
      directives: Serializer.deserialize(obj.directives, DirectiveBinder),
      nestedProtoView: Serializer.deserialize(obj.nestedProtoView, ProtoViewDto),
      propertyBindings: Serializer.deserialize(obj.propertyBindings, ElementPropertyBinding),
      variableBindings: Serializer.objectToMap(obj.variableBindings),
      eventBindings: Serializer.deserialize(obj.eventBindings, EventBinding),
      readAttributes: Serializer.objectToMap(obj.readAttributes)
    });
  }
}

class ProtoViewDtoSerializer {
  static serialize(view: ProtoViewDto): Object {
    // TODO: fix render refs and write a serializer for them
    return {
      'render': null,
      'elementBinders': Serializer.serialize(view.elementBinders, ElementBinder),
      'variableBindings': Serializer.mapToObject(view.variableBindings),
      'textBindings': Serializer.serialize(view.textBindings, ASTWithSource),
      'type': view.type
    };
  }

  static deserialize(obj: any): ProtoViewDto {
    return new ProtoViewDto({
      render: null,  // TODO: fix render refs and write a serializer for them
      elementBinders: Serializer.deserialize(obj.elementBinders, ElementBinder),
      variableBindings: Serializer.objectToMap(obj.variableBindings),
      textBindings: Serializer.deserialize(obj.textBindings, ASTWithSource, "interpolation"),
      type: obj.type
    });
  }
}

class DirectiveMetadataSerializer {
  static serialize(meta: DirectiveMetadata): Object {
    var obj = {
      'id': meta.id,
      'selector': meta.selector,
      'compileChildren': meta.compileChildren,
      'hostProperties': Serializer.mapToObject(meta.hostProperties),
      'hostListeners': Serializer.mapToObject(meta.hostListeners),
      'hostActions': Serializer.mapToObject(meta.hostActions),
      'hostAttributes': Serializer.mapToObject(meta.hostAttributes),
      'properties': meta.properties,
      'readAttributes': meta.readAttributes,
      'type': meta.type,
      'exportAs': meta.exportAs,
      'callOnDestroy': meta.callOnDestroy,
      'callOnCheck': meta.callOnCheck,
      'callOnInit': meta.callOnInit,
      'callOnAllChangesDone': meta.callOnAllChangesDone,
      'changeDetection': meta.changeDetection,
      'events': meta.events
    };
    return obj;
  }
  static deserialize(obj: any): DirectiveMetadata {
    return new DirectiveMetadata({
      id: obj.id,
      selector: obj.selector,
      compileChildren: obj.compileChildren,
      hostProperties: Serializer.objectToMap(obj.hostProperties),
      hostListeners: Serializer.objectToMap(obj.hostListeners),
      hostActions: Serializer.objectToMap(obj.hostActions),
      hostAttributes: Serializer.objectToMap(obj.hostAttributes),
      properties: obj.properties,
      readAttributes: obj.readAttributes,
      type: obj.type,
      exportAs: obj.exportAs,
      callOnDestroy: obj.callOnDestroy,
      callOnCheck: obj.callOnCheck,
      callOnInit: obj.callOnInit,
      callOnAllChangesDone: obj.callOnAllChangesDone,
      changeDetection: obj.changeDetection,
      events: obj.events
    });
  }
}
