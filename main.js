/*
 * Copyright (c) 2014 MKLab. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true */
/*global define, $, _, window, app, type, appshell, document */

define(function (require, exports, module) {
    "use strict";

    var AppInit             = app.getModule("utils/AppInit"),
        Repository          = app.getModule("core/Repository"),
        Engine              = app.getModule("engine/Engine"),
        Commands            = app.getModule("command/Commands"),
        CommandManager      = app.getModule("command/CommandManager"),
        MenuManager         = app.getModule("menu/MenuManager"),
        Dialogs             = app.getModule("dialogs/Dialogs"),
        ElementPickerDialog = app.getModule("dialogs/ElementPickerDialog"),
        FileSystem          = app.getModule("filesystem/FileSystem"),
        FileSystemError     = app.getModule("filesystem/FileSystemError"),
        ExtensionUtils      = app.getModule("utils/ExtensionUtils"),
        UML                 = app.getModule("uml/UML"),
        FileUtils           = app.getModule("file/FileUtils");        
    

    var CodeGenUtils        = require("CodeGenUtils"),
        CsharpPreferences   = require("CsharpPreferences"),
        CsharpCodeGenerator = require("CsharpCodeGenerator"),
        CsharpReverseEngineer = require("CsharpReverseEngineer");
        
    require("HelperUtils");
    

    /**
     * Commands IDs
     */
    var CMD_CSHARP              = "csharp",
        CMD_CSHARP_GENERATE     = "csharp.generate",
        CMD_CSHARP_REVERSE      = "csharp.reverse",
        CMD_CSHARP_CONFIGURE    = "csharp.configure";

    /**
     * Command Handler for C# Generate
     *
     * @param {Element} base
     * @param {string} path
     * @param {Object} options
     * @return {$.Promise}
     */
    function _handleGenerate(base, path, options) {
        var result = new $.Deferred();

        // If options is not passed, get from preference
        options = options || CsharpPreferences.getGenOptions();

        // If base is not assigned, popup ElementPicker
        if (!base) {
            ElementPickerDialog.showDialog("Select a base model to generate codes", null, type.UMLPackage)
                .done(function (buttonId, selected) {
                    if (buttonId === Dialogs.DIALOG_BTN_OK && selected) {
                        base = selected;                        
                        // If path is not assigned, popup Open Dialog to select a folder
                        if (!path) {
                            FileSystem.showOpenDialog(false, false, "Select a C# project where generated codes to be located", null, ["csproj"], function (err, files) {
                                if (!err) {
                                    if (files.length > 0) {
                                        var filePath=files[0];
                                        var fileExt= FileUtils.getFileExtension(filePath);
                                        if(fileExt!="csproj"){
                                            Dialogs.showAlertDialog("Select a C# project.");   
                                            result.reject(FileSystem.USER_CANCELED);                                                                                                                         
                                        }else{
                                            var fileBase=FileUtils.getBaseName(filePath);
                                            var projectName=fileBase.replace("."+fileExt,"");
                                            path = files[0].replace(fileBase,"");
                                            CsharpCodeGenerator.generate(base, path,projectName, options).then(result.resolve, result.reject);                                            
                                        }
                                        
                                    } else {
                                        result.reject(FileSystem.USER_CANCELED);
                                    }
                                } else {
                                    result.reject(err);
                                }
                            });
                        } else {
                            CsharpCodeGenerator.generate(base, path, options).then(result.resolve, result.reject);
                        }
                    } else {
                        result.reject();
                    }
                });
        } else {
            // If path is not assigned, popup Open Dialog to select a folder
            if (!path) {
                FileSystem.showOpenDialog(false, false, "Select a C# project where generated codes to be located", null, null, function (err, files) {
                    if (!err) {
                        if (files.length > 0) {
                            path = files[0];                            
                            var filePath=files[0];
                            var fileExt= FileUtils.getFileExtension(filePath);
                            if(fileExt!="csproj"){
                                Dialogs.showAlertDialog("Select a C# project.");   
                                result.reject(FileSystem.USER_CANCELED);                                                                                                                         
                            }else{
                                var fileBase=FileUtils.getBaseName(filePath);
                                var projectName=fileBase.replace("."+fileExt,"");
                                path = files[0].replace(fileBase,"");
                                CsharpCodeGenerator.generate(base, path,projectName, options).then(result.resolve, result.reject);                                            
                            }
                        } else {
                            result.reject(FileSystem.USER_CANCELED);
                        }
                    } else {
                        result.reject(err);
                    }
                });
            } else {                
                CsharpCodeGenerator.generate(base, path,null, options).then(result.resolve, result.reject);
            }
        }
        return result.promise();
    }


    /**
     * Command Handler for C# Reverse
     *
     * @param {string} basePath
     * @param {Object} options
     * @return {$.Promise}
     */
    function _handleReverse(basePath, options) {
        var result = new $.Deferred();

        // If options is not passed, get from preference
        options = CsharpPreferences.getRevOptions();

        // If basePath is not assigned, popup Open Dialog to select a folder
        if (!basePath) {
            FileSystem.showOpenDialog(false, true, "Select Folder", null, null, function (err, files) {
                if (!err) {
                    if (files.length > 0) {
                        basePath = files[0];
                        CsharpReverseEngineer.analyze(basePath, options).then(result.resolve, result.reject);
                    } else {
                        result.reject(FileSystem.USER_CANCELED);
                    }
                } else {
                    result.reject(err);
                }
            });
        }
        return result.promise();
    }

    function _handleConfigure() {
        CommandManager.execute(Commands.FILE_PREFERENCES, CsharpPreferences.getId());
    }

    // Register Commands
    CommandManager.register("C#",               CMD_CSHARP,           CommandManager.doNothing);
    CommandManager.register("Generate Code...", CMD_CSHARP_GENERATE,  _handleGenerate);
    CommandManager.register("Reverse Code...",  CMD_CSHARP_REVERSE,   _handleReverse);
    CommandManager.register("Configure...",     CMD_CSHARP_CONFIGURE, _handleConfigure);

    var menu, menuItem;
    menu = MenuManager.getMenu(Commands.TOOLS);
    menuItem = menu.addMenuItem(CMD_CSHARP);
    menuItem.addMenuItem(CMD_CSHARP_GENERATE);
    menuItem.addMenuItem(CMD_CSHARP_REVERSE);
    menuItem.addMenuDivider();
    menuItem.addMenuItem(CMD_CSHARP_CONFIGURE);
});
